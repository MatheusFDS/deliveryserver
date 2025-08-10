// src/delivery/delivery.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';

import { FREIGHT_CALCULATOR_PROVIDER } from './providers/freight-calculator.interface';
import { PrismaFreightCalculator } from './providers/prisma-freight.calculator';

import { DELIVERY_RULES_VALIDATOR_PROVIDER } from './providers/delivery-rules.validator.interface';
import { TenantApprovalValidator } from './providers/tenant-approval.validator';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    PrismaService,
    {
      provide: FREIGHT_CALCULATOR_PROVIDER,
      useClass: PrismaFreightCalculator,
    },
    {
      provide: DELIVERY_RULES_VALIDATOR_PROVIDER,
      useClass: TenantApprovalValidator,
    },
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
