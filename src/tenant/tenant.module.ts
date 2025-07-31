// src/tenant/tenant.module.ts
import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TenantController],
  providers: [TenantService, PrismaService],
  exports: [TenantService],
})
export class TenantModule {}
