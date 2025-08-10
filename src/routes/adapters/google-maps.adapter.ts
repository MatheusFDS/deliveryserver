// src/routes/adapters/google-maps.adapter.ts

import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { IMapsAdapter } from '../interfaces/maps-adapter.interface';
import {
  OptimizedRouteResult,
  DistanceResult,
  GeocodeResult,
  InteractiveRouteResult,
  StaticMapResult,
  LatLng,
} from '../interfaces/route-optimization.interface';
import { OptimizeRouteDto } from '../dto/optimize-route.dto';
import { BaseMapsAdapter } from './base-maps.adapter';
import { MapsConfigFactory } from '../config/maps.config';
import {
  ApiKeyInvalidException,
  MapsExceptionFactory,
} from '../exceptions/maps.exceptions';
import {
  ICacheService,
  CACHE_SERVICE,
} from '../../infrastructure/cache/cache.interface';
import {
  ICircuitBreakerService,
  CIRCUIT_BREAKER_SERVICE,
} from '../../infrastructure/resilience/circuit-breaker.interface';
import {
  IRetryService,
  RETRY_SERVICE,
} from '../../infrastructure/resilience/retry.interface';

@Injectable()
export class GoogleMapsAdapter extends BaseMapsAdapter implements IMapsAdapter {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrls = {
    directions: 'https://maps.googleapis.com/maps/api/directions/json',
    distanceMatrix: 'https://maps.googleapis.com/maps/api/distancematrix/json',
    geocode: 'https://maps.googleapis.com/maps/api/geocode/json',
    staticMap: 'https://maps.googleapis.com/maps/api/staticmap',
  };

  constructor(
    @Inject(CACHE_SERVICE) cacheService: ICacheService,
    @Inject(CIRCUIT_BREAKER_SERVICE) circuitBreaker: ICircuitBreakerService,
    @Inject(RETRY_SERVICE) retryService: IRetryService,
  ) {
    const config = MapsConfigFactory.create('google');
    super(config, cacheService, circuitBreaker, retryService);

    if (!config.apiKey) {
      throw new ApiKeyInvalidException('Google Maps API Key não configurada');
    }

    this.httpClient = axios.create({
      timeout: config.timeout,
      headers: { 'User-Agent': 'LogisticsSaaS/1.0' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.httpClient.interceptors.request.use((config) => {
      this.logger.debug(`Requesting URL: ${config.url}`);
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        throw MapsExceptionFactory.fromNetworkError(error, 'GoogleMaps');
      },
    );
  }

  async optimizeRoute(
    options: OptimizeRouteDto,
  ): Promise<OptimizedRouteResult> {
    const cacheKey = this.cacheService.generateKey('gmaps_optimize', {
      startingPoint: options.startingPoint,
      orders: options.orders.map((o) => o.address).sort(),
    });

    return this.withCache(cacheKey, () =>
      this.executeWithResilience('gmaps_optimize_route', async () => {
        const waypoints = options.orders
          .map((order) => this.sanitizeAddress(order.address))
          .join('|');
        const params = {
          origin: this.sanitizeAddress(options.startingPoint),
          destination: this.sanitizeAddress(options.startingPoint),
          waypoints: `optimize:true|${waypoints}`,
          key: this.config.apiKey,
          language: 'pt-BR',
          units: 'metric',
        };

        const response = await this.httpClient.get(this.baseUrls.directions, {
          params,
        });

        if (response.data.status !== 'OK' || !response.data.routes[0]) {
          throw MapsExceptionFactory.fromGoogleMapsStatus(
            response.data.status,
            response.data.error_message,
          );
        }
        return this.transformDirectionsResponseToOptimizedRoute(
          response.data,
          options,
        );
      }),
    );
  }

  async calculateDistance(
    origin: string | LatLng,
    destination: string | LatLng,
  ): Promise<DistanceResult> {
    const originStr =
      typeof origin === 'string'
        ? this.sanitizeAddress(origin)
        : `${origin.lat},${origin.lng}`;
    const destinationStr =
      typeof destination === 'string'
        ? this.sanitizeAddress(destination)
        : `${destination.lat},${destination.lng}`;
    const cacheKey = this.cacheService.generateKey('gmaps_distance', {
      origin: originStr,
      destination: destinationStr,
    });

    return this.withCache(cacheKey, () =>
      this.executeWithResilience('gmaps_distance', async () => {
        const params = {
          origins: originStr,
          destinations: destinationStr,
          key: this.config.apiKey,
          language: 'pt-BR',
        };
        const response = await this.httpClient.get(
          this.baseUrls.distanceMatrix,
          { params },
        );
        const element = response.data?.rows?.[0]?.elements?.[0];

        if (response.data.status !== 'OK' || element?.status !== 'OK') {
          throw MapsExceptionFactory.fromGoogleMapsStatus(
            element?.status || response.data.status,
            'Cannot calculate distance',
          );
        }
        return {
          distanceInMeters: element.distance.value,
          durationInSeconds: element.duration.value,
        };
      }),
    );
  }

  async geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    const batchSize = Math.min(addresses.length, this.config.maxBatchSize);
    const results: GeocodeResult[] = [];
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((address) => this.geocodeSingleAddress(address)),
      );
      results.push(...batchResults);
    }
    return results;
  }

  private async geocodeSingleAddress(address: string): Promise<GeocodeResult> {
    const sanitizedAddress = this.sanitizeAddress(address);
    const cacheKey = this.cacheService.generateKey('gmaps_geocode', {
      address: sanitizedAddress,
    });

    return this.withCache(cacheKey, () =>
      this.executeWithResilience('gmaps_geocode', async () => {
        const params = {
          address: sanitizedAddress,
          key: this.config.apiKey,
          language: 'pt-BR',
        };
        const response = await this.httpClient.get(this.baseUrls.geocode, {
          params,
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          return {
            originalAddress: address,
            formattedAddress: result.formatted_address,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            success: true,
          };
        } else {
          return {
            originalAddress: address,
            formattedAddress: '',
            lat: 0,
            lng: 0,
            success: false,
            error: response.data.status,
          };
        }
      }),
    );
  }

  async calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult> {
    if (!this.validateLatLng(origin) || !this.validateLatLng(destination)) {
      throw new BadRequestException(
        'Coordenadas de origem ou destino inválidas',
      );
    }

    const cacheKey = this.cacheService.generateKey('gmaps_interactive_route', {
      origin,
      destination,
      waypoints,
    });
    return this.withCache(cacheKey, () =>
      this.executeWithResilience('gmaps_interactive_route', async () => {
        const params: any = {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          key: this.config.apiKey,
        };
        if (waypoints.length > 0) {
          params.waypoints = waypoints
            .filter((wp) => this.validateLatLng(wp))
            .map((wp) => `${wp.lat},${wp.lng}`)
            .join('|');
        }

        const response = await this.httpClient.get(this.baseUrls.directions, {
          params,
        });
        if (response.data.status !== 'OK' || !response.data.routes[0]) {
          throw MapsExceptionFactory.fromGoogleMapsStatus(response.data.status);
        }

        const route = response.data.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;
        const legs = route.legs.map((leg: any) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
          return {
            startAddress: leg.start_address,
            endAddress: leg.end_address,
            distanceInMeters: leg.distance.value,
            durationInSeconds: leg.duration.value,
          };
        });

        return {
          totalDistanceInMeters: totalDistance,
          totalDurationInSeconds: totalDuration,
          polyline: route.overview_polyline.points,
          legs,
        };
      }),
    );
  }

  async generateStaticMapUrl(options: {
    markers: Array<{ location: LatLng; label?: string; color?: string }>;
    polyline?: string;
    size?: string;
  }): Promise<StaticMapResult> {
    const params = new URLSearchParams({
      size: options.size || '600x400',
      maptype: 'roadmap',
      key: this.config.apiKey,
    });
    if (options.polyline) {
      params.append('path', `weight:3|color:blue|enc:${options.polyline}`);
    }
    options.markers.forEach((marker) => {
      if (this.validateLatLng(marker.location)) {
        params.append(
          'markers',
          `color:${marker.color || 'red'}|label:${marker.label || ''}|${marker.location.lat},${marker.location.lng}`,
        );
      }
    });
    return { mapUrl: `${this.baseUrls.staticMap}?${params.toString()}` };
  }

  private transformDirectionsResponseToOptimizedRoute(
    googleResponse: any,
    originalOptions: OptimizeRouteDto,
  ): OptimizedRouteResult {
    const route = googleResponse.routes[0];
    const { startingPoint, orders } = originalOptions;
    let totalDistanceInMeters = 0;
    let totalDurationInSeconds = 0;

    const optimizedWaypoints: OptimizedRouteResult['optimizedWaypoints'] =
      route.waypoint_order.map(
        (waypointIndex: number, optimizedIndex: number) => {
          const originalOrder = orders[waypointIndex];
          const leg = route.legs[optimizedIndex];
          const distance = leg?.distance?.value || 0;
          const duration = leg?.duration?.value || 0;
          totalDistanceInMeters += distance;
          totalDurationInSeconds += duration;
          return {
            id: originalOrder.id,
            address: originalOrder.address,
            clientName: originalOrder.cliente,
            orderNumber: originalOrder.numero,
            order: optimizedIndex + 1,
            distanceFromPreviousInMeters: distance,
            durationFromPreviousInSeconds: duration,
          };
        },
      );

    const finalLeg = route.legs[route.legs.length - 1];
    if (finalLeg) {
      totalDistanceInMeters += finalLeg.distance.value;
      totalDurationInSeconds += finalLeg.duration.value;
    }

    return {
      optimizedWaypoints,
      totalDistanceInMeters,
      totalDurationInSeconds,
      polyline: route.overview_polyline.points,
      hasTolls: route.warnings.some(
        (w: string) =>
          w.toLowerCase().includes('pedágio') ||
          w.toLowerCase().includes('tolls'),
      ),
      mapUrl: this.buildStaticMapUrl(
        [{ id: 'start', address: startingPoint }, ...optimizedWaypoints],
        route.overview_polyline.points,
      ),
    };
  }

  private buildStaticMapUrl(waypoints: any[], polyline: string): string {
    const params = new URLSearchParams({
      size: '600x400',
      maptype: 'roadmap',
      key: this.config.apiKey,
    });
    params.append('path', `weight:3|color:blue|enc:${polyline}`);
    waypoints.forEach((waypoint, index) => {
      const label = index === 0 ? 'P' : `${index}`;
      const color = index === 0 ? 'green' : 'red';
      params.append(
        'markers',
        `color:${color}|label:${label}|${this.sanitizeAddress(waypoint.address)}`,
      );
    });
    return `${this.baseUrls.staticMap}?${params.toString()}`;
  }
}
