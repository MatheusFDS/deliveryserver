// src/routes/routes.service.ts

/**
 * ROUTES SERVICE - INTEGRADO COM INFRAESTRUTURA DE RESILIÊNCIA
 *
 * Justificativa: Mantém a estrutura existente mas adiciona a infraestrutura
 * de resiliência essencial (cache, circuit breaker, retry) de forma gradual.
 *
 * Mudanças principais:
 * - ✅ Integração com CacheService para performance
 * - ✅ CircuitBreaker para proteção contra falhas
 * - ✅ RetryService para recuperação automática
 * - ✅ Tratamento específico de MapsException
 * - ✅ Validação básica melhorada
 * - ✅ Operation IDs para rastreamento
 */

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
  StaticMapResult,
  LatLng,
} from './interfaces/route-optimization.interface';

// === NOVOS IMPORTS - INFRAESTRUTURA DE RESILIÊNCIA ===
import { CacheService } from './services/cache.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RetryService } from './services/retry.service';
import {
  MapsException,
  extractErrorContext,
} from './exceptions/maps.exceptions';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @Inject(MAPS_ADAPTER) private readonly mapsAdapter: IMapsAdapter,
    private readonly prisma: PrismaService,
    // === NOVOS SERVIÇOS INJETADOS ===
    private readonly cacheService: CacheService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryService: RetryService,
  ) {}

  // === MÉTODO HELPER PARA TENANT CACHE ===
  private async getTenantIdFromUserId(userId: string): Promise<string> {
    // Cache check para evitar múltiplas consultas do mesmo usuário
    const cacheKey = this.cacheService.generateKey('user_tenant', { userId });
    const cachedTenantId = await this.cacheService.get<string>(cacheKey);

    if (cachedTenantId) {
      return cachedTenantId;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });

      if (!user || !user.tenantId) {
        this.logger.warn(`User ${userId} not found or without tenantId`);
        throw new UnauthorizedException('Usuário não associado a um tenant.');
      }

      // Cache por 15 minutos
      await this.cacheService.set(cacheKey, user.tenantId, 900);
      return user.tenantId;
    } catch (error) {
      this.logger.error(`Error getting tenant for user ${userId}:`, error);
      throw error;
    }
  }

  // === MÉTODO PRINCIPAL - OTIMIZAÇÃO DE ROTA ===
  async optimizeRoute(
    optimizeRouteDto: OptimizeRouteDto,
    userId: string,
  ): Promise<OptimizedRouteResult> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    this.logger.log(
      `[${operationId}] Starting route optimization for user ${userId}`,
    );

    try {
      // 1. Validação básica melhorada
      this.validateOptimizeRouteInput(optimizeRouteDto);

      // 2. Obter tenant com cache
      const tenantId = await this.getTenantIdFromUserId(userId);

      // 3. Cache check para rota similar
      const cacheKey = this.cacheService.generateKey('optimize_route', {
        startingPoint: optimizeRouteDto.startingPoint.trim().toLowerCase(),
        orders: optimizeRouteDto.orders
          .map((o) => o.address.trim().toLowerCase())
          .sort(),
        tenantId,
      });

      const cachedResult =
        await this.cacheService.get<OptimizedRouteResult>(cacheKey);
      if (cachedResult) {
        const duration = Date.now() - startTime;
        this.logger.log(
          `[${operationId}] Route optimization served from cache in ${duration}ms`,
        );
        return cachedResult;
      }

      // 4. Executar com resiliência (circuit breaker + retry)
      this.logger.debug(
        `[${operationId}] Optimizing route with ${optimizeRouteDto.orders.length} orders`,
      );

      const optimizedRouteResult = await this.executeWithResilience(
        `optimize-route-${operationId}`,
        () => this.mapsAdapter.optimizeRoute(optimizeRouteDto),
        'route optimization',
      );

      // 5. Cache do resultado por 1 hora
      await this.cacheService.set(cacheKey, optimizedRouteResult, 3600);

      // 6. Salvar no banco (async, não bloqueia)
      this.saveOptimizedRoute(
        tenantId,
        optimizeRouteDto.startingPoint,
        optimizedRouteResult,
      )
        .then(() =>
          this.logger.debug(
            `[${operationId}] Route saved for tenant ${tenantId}`,
          ),
        )
        .catch((error) =>
          this.logger.error(`[${operationId}] Failed to save route:`, error),
        );

      // 7. Log de sucesso
      const duration = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Route optimization completed in ${duration}ms`,
      );

      return optimizedRouteResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.handleError(error, 'route optimization', operationId, duration);
      throw error;
    }
  }

  // === CALCULAR DISTÂNCIA COM CACHE ===
  async calculateDistance(
    origin: string | LatLng,
    destination: string | LatLng,
  ): Promise<DistanceResult> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Calculating distance between points`);

    try {
      // Validação básica
      if (!origin || !destination) {
        throw new BadRequestException('Origem e destino são obrigatórios');
      }

      // Cache check (24 horas para distâncias)
      const cacheKey = this.cacheService.generateKey('distance', {
        origin: this.normalizeLocation(origin),
        destination: this.normalizeLocation(destination),
      });

      const cachedResult =
        await this.cacheService.get<DistanceResult>(cacheKey);
      if (cachedResult) {
        this.logger.debug(`[${operationId}] Distance served from cache`);
        return cachedResult;
      }

      // Executar com resiliência
      const result = await this.executeWithResilience(
        `distance-${operationId}`,
        () => this.mapsAdapter.calculateDistance(origin, destination),
        'distance calculation',
      );

      // Cache por 24 horas
      await this.cacheService.set(cacheKey, result, 86400);

      return result;
    } catch (error) {
      this.handleError(error, 'distance calculation', operationId);
      throw error;
    }
  }

  // === GEOCODING COM CACHE INDIVIDUAL ===
  async geocodeAddresses(addresses: string[]): Promise<GeocodeResult[]> {
    const operationId = this.generateOperationId();
    this.logger.debug(
      `[${operationId}] Geocoding ${addresses.length} addresses`,
    );

    try {
      // Validação
      if (!addresses || addresses.length === 0) {
        throw new BadRequestException('Lista de endereços é obrigatória');
      }

      if (addresses.length > 100) {
        throw new BadRequestException('Máximo de 100 endereços por consulta');
      }

      // Verificar cache individual para cada endereço
      const results: GeocodeResult[] = [];
      const uncachedAddresses: string[] = [];
      const indexMap = new Map<string, number>();

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i].trim().toLowerCase();
        const cacheKey = this.cacheService.generateKey('geocode', { address });

        const cached = await this.cacheService.get<GeocodeResult>(cacheKey);
        if (cached) {
          results[i] = cached;
        } else {
          uncachedAddresses.push(addresses[i]);
          indexMap.set(addresses[i], i);
        }
      }

      // Processar endereços não cacheados
      if (uncachedAddresses.length > 0) {
        const freshResults = await this.executeWithResilience(
          `geocoding-${operationId}`,
          () => this.mapsAdapter.geocodeAddresses(uncachedAddresses),
          'geocoding',
        );

        // Distribuir resultados e cachear individualmente
        for (let i = 0; i < freshResults.length; i++) {
          const result = freshResults[i];
          const originalIndex = indexMap.get(uncachedAddresses[i])!;
          results[originalIndex] = result;

          // Cache por 7 dias se sucesso, 1 hora se erro
          const cacheKey = this.cacheService.generateKey('geocode', {
            address: uncachedAddresses[i].trim().toLowerCase(),
          });
          const ttl = result.success ? 604800 : 3600;
          await this.cacheService.set(cacheKey, result, ttl);
        }
      }

      const successRate = (
        (results.filter((r) => r.success).length / results.length) *
        100
      ).toFixed(1);
      this.logger.debug(
        `[${operationId}] Geocoding completed. Success rate: ${successRate}%`,
      );

      return results;
    } catch (error) {
      this.handleError(error, 'geocoding', operationId);
      throw error;
    }
  }

  // === ROTA INTERATIVA COM CACHE ===
  async calculateInteractiveRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<InteractiveRouteResult> {
    const operationId = this.generateOperationId();
    this.logger.debug(
      `[${operationId}] Calculating interactive route with ${waypoints.length} waypoints`,
    );

    try {
      // Validação
      if (!origin || !destination) {
        throw new BadRequestException('Origem e destino são obrigatórios');
      }

      // Cache check
      const cacheKey = this.cacheService.generateKey('interactive_route', {
        origin,
        destination,
        waypoints,
      });

      const cachedResult =
        await this.cacheService.get<InteractiveRouteResult>(cacheKey);
      if (cachedResult) {
        this.logger.debug(
          `[${operationId}] Interactive route served from cache`,
        );
        return cachedResult;
      }

      // Executar com resiliência
      const result = await this.executeWithResilience(
        `interactive-route-${operationId}`,
        () =>
          this.mapsAdapter.calculateInteractiveRoute(
            origin,
            destination,
            waypoints,
          ),
        'interactive route calculation',
      );

      // Cache por 1 hora
      await this.cacheService.set(cacheKey, result, 3600);

      return result;
    } catch (error) {
      this.handleError(error, 'interactive route calculation', operationId);
      throw error;
    }
  }

  // === MAPA ESTÁTICO ===
  async generateStaticMap(
    markers: Array<{ location: LatLng; label?: string; color?: string }>,
    polyline?: string,
    size?: string,
  ): Promise<StaticMapResult> {
    const operationId = this.generateOperationId();

    try {
      if (!markers || markers.length === 0) {
        throw new BadRequestException('Pelo menos um marcador é obrigatório');
      }

      // Para mapas estáticos, usar retry simples (menos crítico)
      return await this.retryService.withRetry(
        () =>
          this.mapsAdapter.generateStaticMapUrl({ markers, polyline, size }),
        2,
        1000,
      );
    } catch (error) {
      this.handleError(error, 'static map generation', operationId);
      throw error;
    }
  }

  // === OBTER MAPA DA ROTA SALVA ===
  async getRouteMap(
    routeId: string,
    userId: string,
  ): Promise<OptimizedRouteResult> {
    const operationId = this.generateOperationId();
    this.logger.debug(
      `[${operationId}] Getting route map for routeId: ${routeId}`,
    );

    try {
      if (!routeId?.trim()) {
        throw new BadRequestException('Route ID é obrigatório');
      }

      const tenantId = await this.getTenantIdFromUserId(userId);

      // Cache da rota salva
      const cacheKey = this.cacheService.generateKey('saved_route', {
        routeId,
        tenantId,
      });
      const cachedResult =
        await this.cacheService.get<OptimizedRouteResult>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`[${operationId}] Saved route served from cache`);
        return cachedResult;
      }

      const savedRoute = await this.prisma.optimizedRoute.findFirst({
        where: { id: routeId, tenantId },
      });

      if (!savedRoute) {
        this.logger.warn(
          `[${operationId}] Route ${routeId} not found for tenant ${tenantId}`,
        );
        throw new NotFoundException(
          'Rota não encontrada ou não pertence ao seu tenant.',
        );
      }

      const result = savedRoute.providerData as unknown as OptimizedRouteResult;

      // Cache por 30 minutos
      await this.cacheService.set(cacheKey, result, 1800);

      return result;
    } catch (error) {
      this.handleError(error, 'get route map', operationId);
      throw error;
    }
  }

  // === MÉTODOS PRIVADOS DE SUPORTE ===

  /**
   * Executa operação com circuit breaker + retry
   */
  private async executeWithResilience<T>(
    circuitName: string,
    operation: () => Promise<T>,
    operationDescription: string,
  ): Promise<T> {
    return this.circuitBreaker.execute(
      circuitName,
      () =>
        this.retryService.executeWithRetry(
          operation,
          {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true,
          },
          operationDescription,
        ),
      {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 300000,
      },
    );
  }

  /**
   * Salva rota otimizada (mantém método original)
   */
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

      this.logger.debug(`Optimized route saved for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error('Failed to save optimized route:', error);
      // Não propaga o erro para não afetar a resposta principal
    }
  }

  /**
   * Tratamento melhorado de erros
   */
  private handleError(
    error: any,
    operation: string,
    operationId: string,
    duration?: number,
  ): void {
    const timing = duration ? ` after ${duration}ms` : '';
    const errorContext = extractErrorContext(error);

    if (error instanceof MapsException) {
      this.logger.error(
        `[${operationId}] ${operation} failed${timing} (Maps Error):`,
        {
          ...errorContext,
          code: error.code,
          provider: error.provider,
          isRetryable: error.isRetryable,
        },
      );
    } else {
      this.logger.error(
        `[${operationId}] ${operation} failed${timing}:`,
        errorContext,
      );
    }
  }

  /**
   * Validação básica para otimização de rota
   */
  private validateOptimizeRouteInput(dto: OptimizeRouteDto): void {
    if (!dto.startingPoint?.trim()) {
      throw new BadRequestException('Ponto de partida é obrigatório');
    }

    if (!dto.orders || dto.orders.length === 0) {
      throw new BadRequestException('Lista de pedidos é obrigatória');
    }

    if (dto.orders.length > 25) {
      throw new BadRequestException('Máximo de 25 pedidos por otimização');
    }

    // Verificar se todos os pedidos têm endereço
    for (const order of dto.orders) {
      if (!order.address?.trim()) {
        throw new BadRequestException(
          `Endereço obrigatório para pedido ${order.id}`,
        );
      }
    }
  }

  /**
   * Normaliza localização para cache
   */
  private normalizeLocation(location: string | LatLng): string {
    if (typeof location === 'string') {
      return location.trim().toLowerCase();
    }
    return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
  }

  /**
   * Gera ID único para operação
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
