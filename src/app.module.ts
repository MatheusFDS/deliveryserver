// src/app.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './middleware/logger.middleware';

// Módulos de Infraestrutura e Core
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { PrismaModule } from './prisma/prisma.module';

// Módulos de Negócio
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { OrdersModule } from './orders/orders.module';
import { DirectionsModule } from './directions/directions.module';
import { DeliveryModule } from './delivery/delivery.module';
import { CategoryModule } from './category/category.module';
import { PaymentsModule } from './payments/payments.module';
import { StatisticsModule } from './statistics/statistics.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { TenantModule } from './tenant/tenant.module';
import { RolesModule } from './roles/roles.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { MobileModule } from './mobile/mobile.module';
import { RoutesModule } from './routes/routes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InvitesModule } from './invites/invites.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    InfrastructureModule,

    PrismaModule,
    OrdersModule,
    StatisticsModule,
    PaymentsModule,
    CategoryModule,
    DirectionsModule,
    TenantModule,
    UsersModule,
    AuthModule,
    DriversModule,
    VehiclesModule,
    DeliveryModule,
    UserSettingsModule,
    RolesModule,
    PlatformAdminModule,
    MobileModule,
    RoutesModule,
    NotificationsModule,
    InvitesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
