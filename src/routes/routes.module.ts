// src/routes/routes.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Módulos de negócio dos quais este módulo depende ou que dependem dele
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';

// Componentes específicos do RoutesModule
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { routesProviders } from './providers/routes.providers';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [RoutesController],
  providers: [RoutesService, PrismaService, ...routesProviders],
  exports: [RoutesService],
})
export class RoutesModule {}
