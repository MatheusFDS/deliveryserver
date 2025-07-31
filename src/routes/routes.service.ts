import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import {
  OptimizeRouteResponse,
  OptimizedOrder,
  GoogleMapsDirectionsResponse,
  DistanceCalculationResponse,
  GeocodeResult,
  RouteCalculationResult,
  DistanceMatrixResponse,
  GeocodeResponse,
} from './interfaces/route-optimization.interface';
import axios from 'axios';

@Injectable()
export class RoutesService {
  private readonly googleMapsApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.googleMapsApiKey = this.configService.get<string>('Maps_API_KEY');
    if (!this.googleMapsApiKey) {
      console.error('MAPS_API_KEY is not configured!');
      throw new Error('Google Maps API Key is missing.');
    }
  }

  private async getTenantIdFromUserId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Usuário não associado a um tenant.');
    }
    return user.tenantId;
  }

  async optimizeRoute(
    optimizeRouteDto: OptimizeRouteDto,
    userId: string,
  ): Promise<OptimizeRouteResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tenantId = await this.getTenantIdFromUserId(userId);

    try {
      const { startingPoint, orders } = optimizeRouteDto;

      if (!this.googleMapsApiKey) {
        throw new BadRequestException(
          'Serviço de otimização não configurado. Chave API Google Maps ausente.',
        );
      }

      const waypoints = orders.map((order) => order.address).join('|');

      const directionsUrl =
        'https://maps.googleapis.com/maps/api/directions/json';
      const params: any = {
        origin: startingPoint,
        destination: startingPoint,
        waypoints: `optimize:true|${waypoints}`,
        key: this.googleMapsApiKey,
        language: 'pt-BR',
        region: 'BR',
        units: 'metric',
      };

      const response = await axios.get<GoogleMapsDirectionsResponse>(
        directionsUrl,
        { params },
      );

      if (response.data.status !== 'OK') {
        throw new BadRequestException(
          `Erro ao calcular rota: ${response.data.status}`,
        );
      }

      const route = response.data.routes[0];

      if (!route) {
        throw new BadRequestException('Nenhuma rota encontrada');
      }

      const waypointOrder = route.waypoint_order;
      const optimizedOrders: OptimizedOrder[] = [];

      let totalDistance = 0;
      let totalTime = 0;
      let hasTolls = false;

      waypointOrder.forEach((waypointIndex, optimizedIndex) => {
        const originalOrder = orders[waypointIndex];
        const leg = route.legs[optimizedIndex];

        optimizedOrders.push({
          id: originalOrder.id,
          optimizedOrder: optimizedIndex + 1,
          address: originalOrder.address,
          cliente: originalOrder.cliente,
          numero: originalOrder.numero,
          distanceFromPrevious: leg?.distance?.value || 0,
          estimatedTime: leg?.duration?.value || 0,
        });

        if (leg) {
          totalDistance += leg.distance.value;
          totalTime += leg.duration.value;
          if (leg.tolls && leg.tolls.length > 0) {
            hasTolls = true;
          }
        }
      });

      if (route.legs.length > waypointOrder.length) {
        const finalLeg = route.legs[route.legs.length - 1];
        if (finalLeg) {
          totalDistance += finalLeg.distance.value;
          totalTime += finalLeg.duration.value;
          if (finalLeg.tolls && finalLeg.tolls.length > 0) {
            hasTolls = true;
          }
        }
      }

      if (
        route.warnings &&
        route.warnings.some((warning) => warning.includes('tolls'))
      ) {
        hasTolls = true;
      }

      // CHAMA O MÉTODO PRIVADO RESTAURADO AQUI
      const mapUrl = this.generateStaticMapUrl(
        startingPoint,
        orders,
        waypointOrder,
      );

      return {
        success: true,
        optimizedOrders,
        totalDistance: Math.round((totalDistance / 1000) * 100) / 100,
        totalTime: Math.round(totalTime / 60),
        mapUrl,
        polyline: route.overview_polyline.points,
        hasTolls: hasTolls,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error optimizing route:', error.message || error);
      throw new BadRequestException(
        'Erro interno ao otimizar rota. Por favor, tente novamente.',
      );
    }
  }

  async calculateDistance(
    origin: string,
    destination: string,
  ): Promise<DistanceCalculationResponse> {
    try {
      if (!this.googleMapsApiKey) {
        throw new BadRequestException(
          'Serviço de cálculo não configurado. Chave API Google Maps ausente.',
        );
      }

      const distanceUrl =
        'https://maps.googleapis.com/maps/api/distancematrix/json';
      const params = {
        origins: origin,
        destinations: destination,
        key: this.googleMapsApiKey,
        language: 'pt-BR',
        units: 'metric',
      };

      const response = await axios.get<DistanceMatrixResponse>(distanceUrl, {
        params,
      });

      if (response.data.status !== 'OK') {
        throw new BadRequestException(
          `Erro ao calcular distância: ${response.data.status}`,
        );
      }

      const element = response.data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        throw new BadRequestException('Não foi possível calcular a distância');
      }

      return {
        distance: {
          text: element.distance.text,
          value: element.distance.value,
        },
        duration: {
          text: element.duration.text,
          value: element.duration.value,
        },
      };
    } catch (error) {
      console.error('Error calculating distance:', error.message || error);
      throw new BadRequestException('Erro ao calcular distância.');
    }
  }

  async geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    try {
      if (!this.googleMapsApiKey) {
        throw new BadRequestException(
          'Serviço de geocodificação não configurado. Chave API Google Maps ausente.',
        );
      }

      const results: GeocodeResult[] = [];

      for (const address of addresses) {
        try {
          const geocodeUrl =
            'https://maps.googleapis.com/maps/api/geocode/json';
          const params = {
            address: address,
            key: this.googleMapsApiKey,
            language: 'pt-BR',
            region: 'BR',
          };

          const response = await axios.get<GeocodeResponse>(geocodeUrl, {
            params,
          });

          if (
            response.data.status === 'OK' &&
            response.data.results.length > 0
          ) {
            const result = response.data.results[0];
            const location = result.geometry.location;

            results.push({
              address,
              lat: location.lat,
              lng: location.lng,
              formatted_address: result.formatted_address,
              success: true,
            });
          } else {
            results.push({
              address,
              lat: 0,
              lng: 0,
              formatted_address: '',
              success: false,
              error: `Não foi possível geocodificar: ${response.data.status}`,
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(
            `Error geocoding address "${address}":`,
            error.message || error,
          );
          results.push({
            address,
            lat: 0,
            lng: 0,
            formatted_address: '',
            success: false,
            error: 'Erro interno ao geocodificar',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error geocoding addresses batch:', error.message || error);
      throw new BadRequestException('Erro ao geocodificar endereços.');
    }
  }

  async calculateInteractiveRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints: Array<{ lat: number; lng: number }>,
  ): Promise<RouteCalculationResult> {
    try {
      if (!this.googleMapsApiKey) {
        throw new BadRequestException(
          'Serviço de rota não configurado. Chave API Google Maps ausente.',
        );
      }

      const directionsUrl =
        'https://maps.googleapis.com/maps/api/directions/json';

      let waypointsParam = '';
      if (waypoints.length > 0) {
        waypointsParam = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|');
      }

      const params: any = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: this.googleMapsApiKey,
        language: 'pt-BR',
        units: 'metric',
        mode: 'driving',
      };

      if (waypointsParam) {
        params.waypoints = waypointsParam;
      }

      const response = await axios.get<GoogleMapsDirectionsResponse>(
        directionsUrl,
        { params },
      );

      if (response.data.status !== 'OK') {
        throw new BadRequestException(
          `Erro ao calcular rota: ${response.data.status}`,
        );
      }

      const route = response.data.routes[0];
      if (!route) {
        throw new BadRequestException('Nenhuma rota encontrada');
      }

      let totalDistance = 0;
      let totalDuration = 0;
      const legs = route.legs.map((leg) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;

        return {
          distance: leg.distance.value,
          duration: leg.duration.value,
          start_address: leg.start_address,
          end_address: leg.end_address,
        };
      });

      return {
        distance: totalDistance,
        duration: totalDuration,
        polyline: route.overview_polyline.points,
        legs,
      };
    } catch (error) {
      console.error(
        'Error calculating interactive route:',
        error.message || error,
      );
      throw new BadRequestException('Erro interno ao calcular rota.');
    }
  }

  async generateStaticMap(
    markers: Array<{
      lat: number;
      lng: number;
      label?: string;
      color?: string;
    }>,
    path: Array<{ lat: number; lng: number }>,
    center?: { lat: number; lng: number },
    zoom: number = 12,
    size: string = '600x400',
    polyline?: string,
  ): Promise<{ mapUrl: string }> {
    try {
      if (!this.googleMapsApiKey) {
        throw new BadRequestException(
          'Serviço de mapa estático não configurado. Chave API Google Maps ausente.',
        );
      }

      const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
      const params = new URLSearchParams();

      params.append('size', size);
      params.append('maptype', 'roadmap');
      params.append('key', this.googleMapsApiKey);

      if (center) {
        params.append('center', `${center.lat},${center.lng}`);
        params.append('zoom', zoom.toString());
      }

      markers.forEach((marker) => {
        const color = marker.color || 'red';
        const label = marker.label || '';
        params.append(
          'markers',
          `color:${color}|label:${label}|${marker.lat},${marker.lng}`,
        );
      });

      if (polyline) {
        params.append('path', `color:0x0000ff|weight:3|enc:${polyline}`);
      } else if (path.length > 0) {
        const pathString = path
          .map((point) => `${point.lat},${point.lng}`)
          .join('|');
        params.append('path', `color:0x0000ff|weight:3|${pathString}`);
      }

      const mapUrl = `${baseUrl}?${params.toString()}`;

      return { mapUrl };
    } catch (error) {
      console.error('Error generating static map:', error.message || error);
      throw new BadRequestException('Erro ao gerar mapa estático.');
    }
  }

  async getRouteMap(routeId: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    try {
      const savedRoute = await this.prisma.optimizedRoute.findFirst({
        where: { id: routeId, tenantId },
      });

      if (!savedRoute) {
        throw new NotFoundException(
          'Rota não encontrada ou não pertence ao seu tenant.',
        );
      }

      return {
        mapUrl: savedRoute.mapUrl,
        routeData: JSON.parse(savedRoute.routeData),
      };
    } catch (error) {
      console.error('Error getting route map:', error.message || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Erro ao buscar rota.');
    }
  }

  // MÉTODO PRIVADO RESTAURADO PARA GERAR URL DE MAPA ESTÁTICO DENTRO DE optimizeRoute
  private generateStaticMapUrl(
    startingPoint: string,
    orders: any[], // Pode ser OrderLocationDto[] se você quiser tipar mais especificamente
    waypointOrder: number[],
  ): string {
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

    let markers = `markers=color:green|label:S|${encodeURIComponent(startingPoint)}`;

    waypointOrder.forEach((waypointIndex, index) => {
      const order = orders[waypointIndex];
      markers += `&markers=color:red|label:${index + 1}|${encodeURIComponent(order.address)}`;
    });

    const params = [
      'size=640x400',
      'maptype=roadmap',
      markers,
      `key=${this.googleMapsApiKey}`,
    ].join('&');

    return `${baseUrl}?${params}`;
  }

  private async saveOptimizedRoute(
    tenantId: string,
    startingPoint: string,
    optimizedOrders: OptimizedOrder[],
    totalDistance: number,
    totalTime: number,
    mapUrl: string,
  ) {
    try {
      const routeData = {
        startingPoint,
        optimizedOrders,
        totalDistance,
        totalTime,
        createdAt: new Date(),
      };

      await this.prisma.optimizedRoute.create({
        data: {
          tenantId,
          startingPoint,
          routeData: JSON.stringify(routeData),
          mapUrl,
          totalDistance,
          totalTime,
        },
      });
    } catch (error) {
      console.error('Error saving optimized route:', error.message || error);
    }
  }
}
