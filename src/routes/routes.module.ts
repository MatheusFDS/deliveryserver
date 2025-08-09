// =============================================================================
// src/routes/routes.module.refactored.ts
// =============================================================================
// Módulo refatorado com todos os novos serviços
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { TenantModule } from 'src/tenant/tenant.module';

// Controllers e Services
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

// Adapters
import { GoogleMapsAdapter } from './adapters/google-maps.adapter';

// Services
import { CacheService } from './services/cache.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RetryService } from './services/retry.service';

// Providers
import { routesProviders } from './providers/routes.providers';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    ConfigModule,
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [RoutesController],
  providers: [
    // Core services
    RoutesService,
    PrismaService,

    // Infrastructure services
    CacheService,
    CircuitBreakerService,
    RetryService,

    // Adapters
    GoogleMapsAdapter,

    // Dependency injection configuration
    ...routesProviders,
  ],
  exports: [
    RoutesService,
    CacheService, // Exporta para outros módulos usarem
  ],
})
export class RoutesModule {}
