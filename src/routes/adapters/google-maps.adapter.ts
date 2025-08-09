// src/routes/adapters/google-maps.adapter.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IMapsAdapter } from '../interfaces/maps-adapter.interface';
import {
  OptimizedRouteResult,
  DistanceResult,
  GeocodeResult,
  InteractiveRouteResult,
  StaticMapResult,
  LatLng,
  Waypoint,
} from '../interfaces/route-optimization.interface';
import { OptimizeRouteDto } from '../dto/optimize-route.dto';

// Interfaces específicas do Google
interface GoogleDirectionsResponse {
  routes: Array<{
    summary: string;
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
    }>;
    waypoint_order: number[];
    overview_polyline: { points: string };
    warnings: string[];
  }>;
  status: string;
}

interface GoogleDistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      status: string;
      distance: { text: string; value: number };
      duration: { text: string; value: number };
    }>;
  }>;
  status: string;
  error_message?: string;
}

interface GoogleGeocodeResponse {
  results: Array<{
    formatted_address: string;
    geometry: { location: LatLng };
  }>;
  status: string;
  error_message?: string;
}

@Injectable()
export class GoogleMapsAdapter implements IMapsAdapter {
  private readonly apiKey: string;
  private readonly directionsApiUrl =
    'https://maps.googleapis.com/maps/api/directions/json';
  private readonly distanceMatrixApiUrl =
    'https://maps.googleapis.com/maps/api/distancematrix/json';
  private readonly geocodeApiUrl =
    'https://maps.googleapis.com/maps/api/geocode/json';
  private readonly staticMapApiUrl =
    'https://maps.googleapis.com/maps/api/staticmap';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('Maps_API_KEY');
    if (!this.apiKey) {
      throw new Error('Google Maps API Key (Maps_API_KEY) is not configured.');
    }
  }

  async geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    const results: GeocodeResult[] = [];
    for (const address of addresses) {
      try {
        const params = {
          address,
          key: this.apiKey,
          language: 'pt-BR',
          region: 'BR',
        };
        const response = await axios.get<GoogleGeocodeResponse>(
          this.geocodeApiUrl,
          { params },
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          // ==================================================================
          // CORREÇÃO APLICADA AQUI
          // Desestruturamos o objeto 'location' para que lat e lng fiquem
          // no nível principal do objeto, como o frontend espera.
          // ==================================================================
          results.push({
            originalAddress: address,
            formattedAddress: result.formatted_address,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            success: true,
          });
        } else {
          results.push({
            originalAddress: address,
            formattedAddress: '',
            lat: 0,
            lng: 0,
            success: false,
            error: response.data.status,
          });
        }
      } catch (error: any) {
        results.push({
          originalAddress: address,
          formattedAddress: '',
          lat: 0,
          lng: 0,
          success: false,
          error: error.message,
        });
      }
    }
    return results;
  }

  async optimizeRoute(
    options: OptimizeRouteDto,
  ): Promise<OptimizedRouteResult> {
    const { startingPoint, orders } = options;
    const waypoints = orders.map((order) => order.address).join('|');
    const params = {
      origin: startingPoint,
      destination: startingPoint,
      waypoints: `optimize:true|${waypoints}`,
      key: this.apiKey,
      language: 'pt-BR',
      region: 'BR',
      units: 'metric',
    };

    const response = await axios.get<GoogleDirectionsResponse>(
      this.directionsApiUrl,
      { params },
    );
    if (response.data.status !== 'OK' || !response.data.routes[0]) {
      throw new BadRequestException(
        `Erro ao calcular rota com Google Maps: ${response.data.status}`,
      );
    }
    return this.transformDirectionsResponseToOptimizedRouteResult(
      response.data,
      options,
    );
  }

  async calculateDistance(
    origin: string | LatLng,
    destination: string | LatLng,
  ): Promise<DistanceResult> {
    const params = {
      origins:
        typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
      destinations:
        typeof destination === 'string'
          ? destination
          : `${destination.lat},${destination.lng}`,
      key: this.apiKey,
      language: 'pt-BR',
      units: 'metric',
    };
    const response = await axios.get<GoogleDistanceMatrixResponse>(
      this.distanceMatrixApiUrl,
      { params },
    );
    if (response.data.status !== 'OK') {
      throw new BadRequestException(
        `Erro ao calcular distância com Google Maps: ${response.data.status} - ${response.data.error_message || ''}`,
      );
    }
    const element = response.data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      throw new BadRequestException(
        'Não foi possível calcular a distância entre os pontos.',
      );
    }
    return {
      distanceInMeters: element.distance.value,
      durationInSeconds: element.duration.value,
    };
  }

  async calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult> {
    const params: any = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      key: this.apiKey,
      language: 'pt-BR',
      units: 'metric',
    };
    if (waypoints.length > 0) {
      params.waypoints = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|');
    }
    const response = await axios.get<GoogleDirectionsResponse>(
      this.directionsApiUrl,
      { params },
    );
    if (response.data.status !== 'OK' || !response.data.routes[0]) {
      throw new BadRequestException(
        `Erro ao calcular rota interativa: ${response.data.status}`,
      );
    }
    const route = response.data.routes[0];
    let totalDistanceInMeters = 0;
    let totalDurationInSeconds = 0;
    const legs = route.legs.map((leg) => {
      totalDistanceInMeters += leg.distance.value;
      totalDurationInSeconds += leg.duration.value;
      return {
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distanceInMeters: leg.distance.value,
        durationInSeconds: leg.duration.value,
      };
    });
    return {
      totalDistanceInMeters,
      totalDurationInSeconds,
      polyline: route.overview_polyline.points,
      legs,
    };
  }

  async generateStaticMapUrl(options: {
    markers: Array<{ location: LatLng; label?: string; color?: string }>;
    polyline?: string;
    size?: string;
  }): Promise<StaticMapResult> {
    const params = new URLSearchParams({
      size: options.size || '600x400',
      maptype: 'roadmap',
      key: this.apiKey,
    });
    if (options.polyline) {
      params.append('path', `weight:3|color:blue|enc:${options.polyline}`);
    }
    options.markers.forEach((marker) => {
      params.append(
        'markers',
        `color:${marker.color || 'red'}|label:${marker.label || ''}|${marker.location.lat},${marker.location.lng}`,
      );
    });
    return Promise.resolve({
      mapUrl: `${this.staticMapApiUrl}?${params.toString()}`,
    });
  }

  private transformDirectionsResponseToOptimizedRouteResult(
    googleResponse: GoogleDirectionsResponse,
    originalOptions: OptimizeRouteDto,
  ): OptimizedRouteResult {
    const route = googleResponse.routes[0];
    const { startingPoint, orders } = originalOptions;

    let totalDistanceInMeters = 0;
    let totalDurationInSeconds = 0;

    const optimizedWaypoints: OptimizedRouteResult['optimizedWaypoints'] =
      route.waypoint_order.map((waypointIndex, optimizedIndex) => {
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
      });

    const finalLeg = route.legs[route.legs.length - 1];
    if (finalLeg) {
      totalDistanceInMeters += finalLeg.distance.value;
      totalDurationInSeconds += finalLeg.duration.value;
    }

    const startingWaypoint: Waypoint = {
      id: 'start_point',
      address: startingPoint,
    };
    const orderedWaypointsForMap = [
      startingWaypoint,
      ...optimizedWaypoints.map((wp) => ({ id: wp.id, address: wp.address })),
    ];

    const mapUrl = this.buildStaticMapUrl(
      orderedWaypointsForMap,
      route.overview_polyline.points,
    );

    return {
      optimizedWaypoints,
      totalDistanceInMeters,
      totalDurationInSeconds,
      polyline: route.overview_polyline.points,
      hasTolls: route.warnings.some(
        (warning) =>
          warning.toLowerCase().includes('pedágio') ||
          warning.toLowerCase().includes('tolls'),
      ),
      mapUrl,
    };
  }

  private buildStaticMapUrl(waypoints: Waypoint[], polyline: string): string {
    const params = new URLSearchParams({
      size: '600x400',
      maptype: 'roadmap',
      key: this.apiKey,
    });
    params.append('path', `weight:3|color:blue|enc:${polyline}`);
    waypoints.forEach((waypoint, index) => {
      const label = index === 0 ? 'P' : index.toString();
      const color = index === 0 ? 'green' : 'red';
      params.append(
        'markers',
        `color:${color}|label:${label}|${waypoint.address}`,
      );
    });
    return `${this.staticMapApiUrl}?${params.toString()}`;
  }
}
