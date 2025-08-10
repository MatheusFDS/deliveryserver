// src/delivery/providers/prisma-freight.calculator.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IFreightCalculator,
  FreightCalculationContext,
} from './freight-calculator.interface';

@Injectable()
export class PrismaFreightCalculator implements IFreightCalculator {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(context: FreightCalculationContext): Promise<number> {
    const { orders, vehicle, tenantId } = context;
    let maxDirectionValue = 0;

    for (const order of orders) {
      const direction = await this.prisma.directions.findFirst({
        where: {
          tenantId,
          rangeInicio: { lte: order.cep },
          rangeFim: { gte: order.cep },
        },
        orderBy: { valorDirecao: 'desc' },
      });

      if (direction && Number(direction.valorDirecao) > maxDirectionValue) {
        maxDirectionValue = Number(direction.valorDirecao);
      }
    }

    const vehicleWithCategory = await this.prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      include: { category: true },
    });

    if (!vehicleWithCategory) {
      throw new BadRequestException(
        `Veículo com ID ${vehicle.id} não encontrado.`,
      );
    }

    const categoryValue = vehicleWithCategory.category?.valor ?? 0;

    return maxDirectionValue + categoryValue;
  }
}
