// src/routes/routes.service.ts

import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import {
  IMapsAdapter,
  MAPS_ADAPTER,
} from './interfaces/maps-adapter.interface';
import {
  OptimizedRouteResult,
  DistanceResult,
  GeocodeResult,
  InteractiveRouteResult,
  StaticMapResult,
  LatLng,
} from './interfaces/route-optimization.interface';

@Injectable()
export class RoutesService {
  constructor(
    @Inject(MAPS_ADAPTER) private readonly mapsAdapter: IMapsAdapter,
    private readonly prisma: PrismaService,
  ) {}

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
  ): Promise<OptimizedRouteResult> {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const optimizedRouteResult =
      await this.mapsAdapter.optimizeRoute(optimizeRouteDto);
    await this.saveOptimizedRoute(
      tenantId,
      optimizeRouteDto.startingPoint,
      optimizedRouteResult,
    );
    return optimizedRouteResult;
  }

  // --- MÉTODOS RESTAURADOS ---

  async calculateDistance(
    origin: string,
    destination: string,
  ): Promise<DistanceResult> {
    return this.mapsAdapter.calculateDistance(origin, destination);
  }

  async geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    return this.mapsAdapter.geocodeAddresses(addresses);
  }

  async calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult> {
    return this.mapsAdapter.calculateInteractiveRoute(
      origin,
      destination,
      waypoints,
    );
  }

  async generateStaticMap(
    markers: Array<{ location: LatLng; label?: string; color?: string }>,
    polyline?: string,
    size?: string,
  ): Promise<StaticMapResult> {
    return this.mapsAdapter.generateStaticMapUrl({ markers, polyline, size });
  }

  async getRouteMap(
    routeId: string,
    userId: string,
  ): Promise<OptimizedRouteResult> {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const savedRoute = await this.prisma.optimizedRoute.findFirst({
      where: { id: routeId, tenantId },
    });
    if (!savedRoute) {
      throw new NotFoundException(
        'Rota não encontrada ou não pertence ao seu tenant.',
      );
    }
    return savedRoute.providerData as unknown as OptimizedRouteResult;
  }

  private async saveOptimizedRoute(
    tenantId: string,
    startingPoint: string,
    result: OptimizedRouteResult,
  ): Promise<void> {
    try {
      await this.prisma.optimizedRoute.create({
        data: {
          tenantId,
          startingPoint,
          provider: 'Maps',
          providerData: result as any,
          totalDistance: result.totalDistanceInMeters,
          totalTime: result.totalDurationInSeconds,
          mapUrl: result.mapUrl,
        },
      });
    } catch (error) {
      console.error('Falha ao salvar a rota otimizada no banco:', error);
    }
  }
}
