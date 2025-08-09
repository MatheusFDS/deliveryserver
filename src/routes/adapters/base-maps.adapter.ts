// =============================================================================
// src/routes/adapters/base-maps.adapter.ts
// =============================================================================
// Classe base para todos os adapters de mapas
import { Logger } from '@nestjs/common';
import { CacheService } from '../services/cache.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { RetryService } from '../services/retry.service';
import { MapsConfig } from '../config/maps.config';

export abstract class BaseMapsAdapter {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly config: MapsConfig,
    protected readonly cacheService: CacheService,
    protected readonly circuitBreaker: CircuitBreakerService,
    protected readonly retryService: RetryService,
  ) {}

  protected async withCache<T>(
    cacheKey: string,
    operation: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    if (!this.config.cacheEnabled) {
      return operation();
    }

    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }

    const result = await operation();
    await this.cacheService.set(cacheKey, result, ttl || this.config.cacheTtl);
    return result;
  }

  protected async executeWithResilience<T>(
    circuitName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.circuitBreaker.execute(
      circuitName,
      () => this.retryService.executeWithRetry(operation),
      {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 300000,
      },
    );
  }

  protected sanitizeAddress(address: string): string {
    return address
      .trim()
      .replace(/[<>]/g, '') // Remove caracteres perigosos
      .substring(0, 200); // Limita tamanho
  }

  protected validateLatLng(latLng: any): boolean {
    return (
      latLng &&
      typeof latLng.lat === 'number' &&
      typeof latLng.lng === 'number' &&
      latLng.lat >= -90 &&
      latLng.lat <= 90 &&
      latLng.lng >= -180 &&
      latLng.lng <= 180
    );
  }
}
