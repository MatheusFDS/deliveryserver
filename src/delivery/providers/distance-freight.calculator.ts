// src/delivery/providers/distance-freight.calculator.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IFreightCalculator,
  FreightCalculationContext,
} from './freight-calculator.interface';
import {
  IMapsAdapter,
  MAPS_ADAPTER,
} from '../../routes/interfaces/maps-adapter.interface';

@Injectable()
export class DistanceFreightCalculator implements IFreightCalculator {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAPS_ADAPTER) private readonly mapsAdapter: IMapsAdapter,
  ) {}

  async calculate(context: FreightCalculationContext): Promise<number> {
    const { orders, tenantId } = context;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.address || tenant.pricePerKm === null) {
      throw new NotFoundException(
        'Cálculo por distância não pode ser executado. Verifique se o endereço e o valor por KM estão configurados para o tenant.',
      );
    }

    const routeDto = {
      startingPoint: tenant.address,
      orders: orders.map((order) => ({
        id: order.id,
        address: order.endereco,
        cliente: order.cliente,
        numero: order.numero,
      })),
    };

    const optimizedRoute = await this.mapsAdapter.optimizeRoute(routeDto);
    const totalDistanceInKm = optimizedRoute.totalDistanceInMeters / 1000;

    const freightValue = totalDistanceInKm * tenant.pricePerKm;

    return parseFloat(freightValue.toFixed(2));
  }
}
