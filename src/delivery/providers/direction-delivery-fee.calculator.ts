// src/delivery/providers/direction-delivery-fee.calculator.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IFreightCalculator,
  FreightCalculationContext,
} from './freight-calculator.interface';

@Injectable()
export class DirectionAndDeliveryFeeFreightCalculator
  implements IFreightCalculator
{
  constructor(private readonly prisma: PrismaService) {}

  async calculate(context: FreightCalculationContext): Promise<number> {
    const { orders, tenantId } = context;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant?.pricePerDelivery === null) {
      throw new NotFoundException(
        'Cálculo por taxa de entrega não pode ser executado. O valor por entrega não está configurado para o tenant.',
      );
    }

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

    const deliveryFee = orders.length * (tenant.pricePerDelivery || 0);

    const freightValue = maxDirectionValue + deliveryFee;

    return parseFloat(freightValue.toFixed(2));
  }
}
