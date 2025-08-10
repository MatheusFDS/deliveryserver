// src/infrastructure/infrastructure.module.ts

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CACHE_SERVICE } from './cache/cache.interface';
import { MemoryCacheService } from './cache/memory-cache.service';

import { CIRCUIT_BREAKER_SERVICE } from './resilience/circuit-breaker.interface';
import { CircuitBreakerService } from './resilience/circuit-breaker.service';

import { RETRY_SERVICE } from './resilience/retry.interface';
import { RetryService } from './resilience/retry.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CACHE_SERVICE,
      useClass: MemoryCacheService,
    },
    {
      provide: CIRCUIT_BREAKER_SERVICE,
      useClass: CircuitBreakerService,
    },
    {
      provide: RETRY_SERVICE,
      useClass: RetryService,
    },
  ],
  exports: [CACHE_SERVICE, CIRCUIT_BREAKER_SERVICE, RETRY_SERVICE],
})
export class InfrastructureModule {}
