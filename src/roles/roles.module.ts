// src/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule], // Mesma observação sobre PrismaModule/PrismaService
  controllers: [RolesController],
  providers: [RolesService, PrismaService],
  exports: [RolesService], // <-- ADICIONADO RolesService aos exports (para PlatformAdminModule)
})
export class RolesModule {}
