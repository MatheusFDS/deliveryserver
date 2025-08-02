// src/directions/directions.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { DirectionsService } from './directions.service';
import { DirectionsController } from './directions.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module'; // Adicionado
import { TenantModule } from '../tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [DirectionsController],
  providers: [DirectionsService, PrismaService],
})
export class DirectionsModule {}
