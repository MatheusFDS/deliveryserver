// src/delivery/delivery.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
import { RoutesModule } from '../routes/routes.module';

import { FREIGHT_CALCULATOR_PROVIDER } from './providers/freight-calculator.interface';
import { FreightCalculatorFactory } from './providers/freight-calculator.factory';
import { DirectionAndCategoryFreightCalculator } from './providers/direction-category-freight.calculator';
import { DirectionAndDeliveryFeeFreightCalculator } from './providers/direction-delivery-fee.calculator';
import { DistanceFreightCalculator } from './providers/distance-freight.calculator';

import { DELIVERY_RULES_VALIDATOR_PROVIDER } from './providers/delivery-rules.validator.interface';
import { TenantApprovalValidator } from './providers/tenant-approval.validator';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
    forwardRef(() => PaymentsModule),
    RoutesModule,
  ],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    PrismaService,

    DirectionAndCategoryFreightCalculator,
    DirectionAndDeliveryFeeFreightCalculator,
    DistanceFreightCalculator,
    FreightCalculatorFactory,

    {
      provide: FREIGHT_CALCULATOR_PROVIDER,
      useClass: FreightCalculatorFactory,
    },
    {
      provide: DELIVERY_RULES_VALIDATOR_PROVIDER,
      useClass: TenantApprovalValidator,
    },
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
