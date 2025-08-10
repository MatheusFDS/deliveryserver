// src/infrastructure/infrastructure.module.ts

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CACHE_SERVICE } from './cache/cache.interface';
import { MemoryCacheService } from './cache/memory-cache.service';

import { CIRCUIT_BREAKER_SERVICE } from './resilience/circuit-breaker.interface';
import { CircuitBreakerService } from './resilience/circuit-breaker.service';

import { RETRY_SERVICE } from './resilience/retry.interface';
import { RetryService } from './resilience/retry.service';

import { NOTIFICATION_PROVIDER } from './notifications/notification.interface';
import { ConsoleNotificationProvider } from './notifications/console-notification.provider';

import { AUDIT_PROVIDER } from './audit/audit.interface';
import { ConsoleAuditProvider } from './audit/console-audit.provider';

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
    {
      provide: NOTIFICATION_PROVIDER,
      useClass: ConsoleNotificationProvider,
    },
    {
      provide: AUDIT_PROVIDER,
      useClass: ConsoleAuditProvider,
    },
  ],
  exports: [
    CACHE_SERVICE,
    CIRCUIT_BREAKER_SERVICE,
    RETRY_SERVICE,
    NOTIFICATION_PROVIDER,
    AUDIT_PROVIDER,
  ],
})
export class InfrastructureModule {}
