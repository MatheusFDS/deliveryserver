// src/routes/adapters/base-maps.adapter.ts

import { Inject, Logger } from '@nestjs/common';
import { MapsConfig } from '../config/maps.config';
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

export abstract class BaseMapsAdapter {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly config: MapsConfig,
    @Inject(CACHE_SERVICE) protected readonly cacheService: ICacheService,
    @Inject(CIRCUIT_BREAKER_SERVICE)
    protected readonly circuitBreaker: ICircuitBreakerService,
    @Inject(RETRY_SERVICE) protected readonly retryService: IRetryService,
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
    return this.circuitBreaker.execute(circuitName, () =>
      this.retryService.executeWithRetry(operation, {}, circuitName),
    );
  }

  protected sanitizeAddress(address: string): string {
    return address.trim().replace(/[<>]/g, '').substring(0, 200);
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
