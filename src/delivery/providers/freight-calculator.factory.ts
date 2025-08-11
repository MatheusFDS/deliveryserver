// src/delivery/providers/freight-calculator.factory.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FreightType } from '@prisma/client';
import {
  IFreightCalculator,
  FreightCalculationContext,
} from './freight-calculator.interface';
import { DirectionAndCategoryFreightCalculator } from './direction-category-freight.calculator';
import { DirectionAndDeliveryFeeFreightCalculator } from './direction-delivery-fee.calculator';
import { DistanceFreightCalculator } from './distance-freight.calculator';

@Injectable()
export class FreightCalculatorFactory implements IFreightCalculator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directionAndCategoryCalculator: DirectionAndCategoryFreightCalculator,
    private readonly directionAndDeliveryFeeCalculator: DirectionAndDeliveryFeeFreightCalculator,
    private readonly distanceBasedCalculator: DistanceFreightCalculator,
  ) {}

  async calculate(context: FreightCalculationContext): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: context.tenantId },
      select: { freightType: true },
    });

    if (!tenant) {
      throw new InternalServerErrorException(
        `Tenant com ID ${context.tenantId} não encontrado.`,
      );
    }

    switch (tenant.freightType) {
      case FreightType.DIRECTION_AND_CATEGORY:
        return this.directionAndCategoryCalculator.calculate(context);

      case FreightType.DIRECTION_AND_DELIVERY_FEE:
        return this.directionAndDeliveryFeeCalculator.calculate(context);

      case FreightType.DISTANCE_BASED:
        return this.distanceBasedCalculator.calculate(context);

      default:
        throw new InternalServerErrorException(
          `Tipo de frete '${tenant.freightType}' não suportado.`,
        );
    }
  }
}
