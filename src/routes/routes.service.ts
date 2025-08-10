// src/routes/routes.service.ts

import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from './../prisma/prisma.service';
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
  LatLng,
} from './interfaces/route-optimization.interface';
import {
  ICacheService,
  CACHE_SERVICE,
} from '../infrastructure/cache/cache.interface';
import { extractErrorContext } from './exceptions/maps.exceptions';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @Inject(MAPS_ADAPTER) private readonly mapsAdapter: IMapsAdapter,
    @Inject(CACHE_SERVICE) private readonly appCache: ICacheService,
    private readonly prisma: PrismaService,
  ) {}

  private async getTenantIdFromUserId(userId: string): Promise<string> {
    const cacheKey = this.appCache.generateKey('user_tenant_id', { userId });
    const cachedTenantId = await this.appCache.get<string>(cacheKey);
    if (cachedTenantId) {
      return cachedTenantId;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Usuário não associado a um tenant.');
    }

    await this.appCache.set(cacheKey, user.tenantId, 900);
    return user.tenantId;
  }

  async optimizeRoute(
    optimizeRouteDto: OptimizeRouteDto,
    userId: string,
  ): Promise<OptimizedRouteResult> {
    const operationId = `op_opt_${Date.now()}`;
    this.logger.log(
      `[${operationId}] Starting route optimization for user ${userId}`,
    );

    try {
      this.validateOptimizeRouteInput(optimizeRouteDto);
      const tenantId = await this.getTenantIdFromUserId(userId);

      const optimizedRouteResult =
        await this.mapsAdapter.optimizeRoute(optimizeRouteDto);

      this.saveOptimizedRoute(
        tenantId,
        optimizeRouteDto.startingPoint,
        optimizedRouteResult,
      ).catch((error) =>
        this.logger.error(
          `[${operationId}] Failed to save route to DB:`,
          error,
        ),
      );

      this.logger.log(
        `[${operationId}] Route optimization completed successfully.`,
      );
      return optimizedRouteResult;
    } catch (error) {
      this.handleServiceError(error, 'route optimization', operationId);
    }
  }

  async calculateDistance(
    origin: string | LatLng,
    destination: string | LatLng,
  ): Promise<DistanceResult> {
    const operationId = `op_dist_${Date.now()}`;
    this.logger.debug(`[${operationId}] Calculating distance`);
    try {
      if (!origin || !destination) {
        throw new BadRequestException('Origem e destino são obrigatórios.');
      }
      return await this.mapsAdapter.calculateDistance(origin, destination);
    } catch (error) {
      this.handleServiceError(error, 'distance calculation', operationId);
    }
  }

  async geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    const operationId = `op_geo_${Date.now()}`;
    this.logger.debug(
      `[${operationId}] Geocoding ${addresses.length} addresses`,
    );
    try {
      if (!addresses || addresses.length === 0) {
        throw new BadRequestException(
          'A lista de endereços não pode ser vazia.',
        );
      }
      return await this.mapsAdapter.geocodeAddresses(addresses);
    } catch (error) {
      this.handleServiceError(error, 'geocoding', operationId);
    }
  }

  async calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult> {
    const operationId = `op_int_${Date.now()}`;
    this.logger.debug(`[${operationId}] Calculating interactive route`);
    try {
      if (!origin || !destination) {
        throw new BadRequestException('Origem e destino são obrigatórios.');
      }
      return await this.mapsAdapter.calculateInteractiveRoute(
        origin,
        destination,
        waypoints,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        'interactive route calculation',
        operationId,
      );
    }
  }

  async getRouteMap(
    routeId: string,
    userId: string,
  ): Promise<OptimizedRouteResult> {
    const operationId = `op_getmap_${Date.now()}`;
    this.logger.debug(
      `[${operationId}] Getting route map for routeId: ${routeId}`,
    );

    try {
      const tenantId = await this.getTenantIdFromUserId(userId);
      const cacheKey = this.appCache.generateKey('saved_route', {
        routeId,
        tenantId,
      });

      const cachedResult =
        await this.appCache.get<OptimizedRouteResult>(cacheKey);
      if (cachedResult) {
        this.logger.debug(`[${operationId}] Saved route served from cache.`);
        return cachedResult;
      }

      const savedRoute = await this.prisma.optimizedRoute.findFirst({
        where: { id: routeId, tenantId },
      });
      if (!savedRoute) {
        throw new NotFoundException(
          'Rota não encontrada ou não pertence ao seu tenant.',
        );
      }

      const result = savedRoute.providerData as unknown as OptimizedRouteResult;
      await this.appCache.set(cacheKey, result, 1800);
      return result;
    } catch (error) {
      this.handleServiceError(error, 'get route map', operationId);
    }
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
          provider: 'GoogleMaps',
          providerData: result as any,
          totalDistance: result.totalDistanceInMeters,
          totalTime: result.totalDurationInSeconds,
          mapUrl: result.mapUrl,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save optimized route to database:', error);
    }
  }

  private handleServiceError(
    error: any,
    operation: string,
    operationId: string,
  ): never {
    const context = extractErrorContext(error);
    this.logger.error(
      `[${operationId}] Service operation "${operation}" failed.`,
      context,
    );
    throw error;
  }

  private validateOptimizeRouteInput(dto: OptimizeRouteDto): void {
    if (!dto.startingPoint?.trim()) {
      throw new BadRequestException('Ponto de partida é obrigatório.');
    }
    if (!dto.orders || dto.orders.length === 0) {
      throw new BadRequestException('A lista de pedidos é obrigatória.');
    }
  }
}
