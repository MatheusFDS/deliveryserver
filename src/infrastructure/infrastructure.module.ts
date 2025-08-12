import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailService } from '../shared/services/email.service';

// Cache
import { CACHE_SERVICE } from './cache/cache.interface';
import { MemoryCacheService } from './cache/memory-cache.service';

// Resilience
import { CIRCUIT_BREAKER_SERVICE } from './resilience/circuit-breaker.interface';
import { CircuitBreakerService } from './resilience/circuit-breaker.service';
import { RETRY_SERVICE } from './resilience/retry.interface';
import { RetryService } from './resilience/retry.service';

// Notifications
import { NOTIFICATION_PROVIDER } from './notifications/notification.interface';
import { RealtimeNotificationProvider } from './notifications/realtime-notification.provider';
import { NotificationGateway } from './notifications/notification.gateway';

// Audit
import { AUDIT_PROVIDER } from './audit/audit.interface';
import { ConsoleAuditProvider } from './audit/console-audit.provider';

// Storage
import { STORAGE_PROVIDER } from './storage/storage.interface';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { CloudinaryStorageProvider } from './storage/cloudinary-storage.provider';
import { FailoverStorageProvider } from './storage/failover-storage.provider';

@Global()
@Module({
  imports: [ConfigModule, NotificationsModule],
  providers: [
    { provide: CACHE_SERVICE, useClass: MemoryCacheService },
    { provide: CIRCUIT_BREAKER_SERVICE, useClass: CircuitBreakerService },
    { provide: RETRY_SERVICE, useClass: RetryService },
    { provide: NOTIFICATION_PROVIDER, useClass: RealtimeNotificationProvider },
    { provide: AUDIT_PROVIDER, useClass: ConsoleAuditProvider },
    LocalStorageProvider,
    CloudinaryStorageProvider,
    FailoverStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useClass: FailoverStorageProvider,
    },
    NotificationGateway,
    EmailService,
  ],
  exports: [
    CACHE_SERVICE,
    CIRCUIT_BREAKER_SERVICE,
    RETRY_SERVICE,
    NOTIFICATION_PROVIDER,
    AUDIT_PROVIDER,
    STORAGE_PROVIDER,
    EmailService,
  ],
})
export class InfrastructureModule {}
