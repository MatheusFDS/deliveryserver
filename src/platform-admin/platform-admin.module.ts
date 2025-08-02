// src/platform-admin/platform-admin.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
import { RolesModule } from '../roles/roles.module';

import { PlatformUsersController } from './users/platform-users.controller';
import { PlatformTenantsController } from './tenants/platform-tenants.controller';
import { PlatformRolesController } from './roles/platform-roles.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    PrismaModule,
    forwardRef(() => UsersModule), // Adicionado forwardRef
    forwardRef(() => TenantModule), // Adicionado forwardRef
    forwardRef(() => RolesModule), // Adicionado forwardRef
  ],
  controllers: [
    PlatformUsersController,
    PlatformTenantsController,
    PlatformRolesController,
  ],
})
export class PlatformAdminModule {}
