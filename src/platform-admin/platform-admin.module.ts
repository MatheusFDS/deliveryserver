// src/platform-admin/platform-admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// Importar os módulos de serviço que contêm a lógica de negócio (UsersService, TenantService, RolesService)
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
import { RolesModule } from '../roles/roles.module';

// Importar os controllers de plataforma
import { PlatformUsersController } from './users/platform-users.controller';
import { PlatformTenantsController } from './tenants/platform-tenants.controller';
import { PlatformRolesController } from './roles/platform-roles.controller';

@Module({
  imports: [
    AuthModule, // Para JwtAuthGuard e RolesGuard
    PrismaModule, // Para PrismaService
    UsersModule, // Contém UsersService
    TenantModule, // Contém TenantService
    RolesModule, // Contém RolesService
  ],
  controllers: [
    PlatformUsersController,
    PlatformTenantsController,
    PlatformRolesController,
  ],
  // Providers não são necessários aqui, pois os services já são fornecidos
  // e exportados por seus respectivos módulos (UsersModule, TenantModule, RolesModule).
})
export class PlatformAdminModule {}
