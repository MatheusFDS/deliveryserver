// src/mobile/mobile.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { DriversService } from '../drivers/drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
import { DeliveryModule } from '../delivery/delivery.module'; // 1. Importar o DeliveryModule

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
    DeliveryModule, // 2. Adicionar o DeliveryModule aos imports
  ],
  controllers: [MobileController],
  // 3. Remover DeliveryService dos providers daqui
  providers: [MobileService, DriversService, PrismaService],
})
export class MobileModule {}
