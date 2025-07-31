import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
} from '../types/status.enum';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  private async getTenantIdFromUserId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Usuário não associado a um tenant.');
    }
    return user.tenantId;
  }

  getRevenueStatistics() {
    throw new Error('Method not implemented.');
  }

  getPerformanceStatistics() {
    throw new Error('Method not implemented.');
  }

  getDashboardStatistics() {
    throw new Error('Method not implemented.');
  }

  async getStatistics(
    userId: string,
    startDate: Date,
    endDate: Date,
    driverId: string,
    // CORRIGIDO: Removido 'includeDetails' pois não era usado
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const ordersInRoute = await this.prisma.order.count({
      where: {
        tenantId,
        status: OrderStatus.EM_ROTA,
        createdAt: dateFilter,
        ...(driverId && { driverId }),
      },
    });

    const ordersFinalized = await this.prisma.order.count({
      where: {
        tenantId,
        status: OrderStatus.ENTREGUE,
        createdAt: dateFilter,
        ...(driverId && { driverId }),
      },
    });

    const ordersPending = await this.prisma.order.count({
      where: {
        tenantId,
        status: OrderStatus.SEM_ROTA,
        createdAt: dateFilter,
        ...(driverId && { driverId }),
      },
    });

    const freightsToPay = await this.prisma.accountsPayable.count({
      where: {
        tenantId,
        status: PaymentStatus.PENDENTE,
        createdAt: dateFilter,
        ...(driverId && { motoristaId: driverId }),
      },
    });

    const freightsPaid = await this.prisma.accountsPayable.count({
      where: {
        tenantId,
        status: PaymentStatus.PAGO,
        createdAt: dateFilter,
        ...(driverId && { motoristaId: driverId }),
      },
    });

    const deliveriesByDriver = await this.prisma.delivery.groupBy({
      by: ['motoristaId'],
      where: {
        tenantId,
        createdAt: dateFilter,
        ...(driverId && { motoristaId: driverId }),
      },
      _count: {
        motoristaId: true,
      },
    });

    const deliveriesInRoute = await this.prisma.delivery.count({
      where: {
        tenantId,
        status: DeliveryStatus.INICIADO,
        createdAt: dateFilter,
        ...(driverId && { motoristaId: driverId }),
      },
    });

    const deliveriesFinalized = await this.prisma.delivery.count({
      where: {
        tenantId,
        status: DeliveryStatus.FINALIZADO,
        createdAt: dateFilter,
        ...(driverId && { motoristaId: driverId }),
      },
    });

    const notesByRegion = await this.getNotesByRegion(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    const drivers = await this.prisma.driver.findMany({
      where: { tenantId, ...(driverId && { id: driverId }) },
      select: {
        id: true,
        name: true,
      },
    });

    const regions = await this.prisma.directions.findMany({
      where: { tenantId },
      select: {
        id: true,
        regiao: true,
      },
    });

    const avgOrdersPerDriver = await this.calculateAvgOrdersPerDriver(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    const avgValueNotesPerDriver = await this.calculateAvgValueNotesPerDriver(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    const avgWeightPerDriver = await this.calculateAvgWeightPerDriver(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    return {
      ordersInRoute,
      ordersFinalized,
      ordersPending,
      freightsToPay,
      freightsPaid,
      deliveriesByDriver,
      deliveriesInRoute,
      deliveriesFinalized,
      notesByRegion,
      drivers,
      regions,
      avgOrdersPerDriver,
      avgValueNotesPerDriver,
      avgWeightPerDriver,
    };
  }

  private async calculateAvgOrdersPerDriver(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter: string,
  ) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(driverIdFilter && { motoristaId: driverIdFilter }),
      },
      select: {
        motoristaId: true,
        orders: {
          select: {
            id: true,
          },
        },
      },
    });

    const driverOrders = deliveries.reduce(
      (acc, delivery) => {
        acc[delivery.motoristaId] =
          (acc[delivery.motoristaId] || 0) + delivery.orders.length;
        return acc;
      },
      {} as Record<string, number>,
    );

    const driverAverages = Object.keys(driverOrders).map((driverId) => ({
      driverId,
      average: parseFloat(
        (
          driverOrders[driverId] /
          deliveries.filter((d) => d.motoristaId === driverId).length
        ).toFixed(2),
      ),
    }));

    return driverAverages;
  }

  private async calculateAvgValueNotesPerDriver(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter: string,
  ) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(driverIdFilter && { motoristaId: driverIdFilter }),
      },
      select: {
        motoristaId: true,
        orders: {
          select: {
            valor: true,
          },
        },
      },
    });

    const driverValues = deliveries.reduce(
      (acc, delivery) => {
        acc[delivery.motoristaId] =
          (acc[delivery.motoristaId] || 0) +
          delivery.orders.reduce((sum, order) => sum + order.valor, 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const driverAverages = Object.keys(driverValues).map((driverId) => ({
      driverId,
      average: parseFloat(
        (
          driverValues[driverId] /
          deliveries.filter((d) => d.motoristaId === driverId).length
        ).toFixed(2),
      ),
    }));

    return driverAverages;
  }

  private async calculateAvgWeightPerDriver(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter: string,
  ) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(driverIdFilter && { motoristaId: driverIdFilter }),
      },
      select: {
        motoristaId: true,
        orders: {
          select: {
            peso: true,
          },
        },
      },
    });

    const driverWeights = deliveries.reduce(
      (acc, delivery) => {
        acc[delivery.motoristaId] =
          (acc[delivery.motoristaId] || 0) +
          delivery.orders.reduce((sum, order) => sum + order.peso, 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const driverAverages = Object.keys(driverWeights).map((driverId) => ({
      driverId,
      average: parseFloat(
        (
          driverWeights[driverId] /
          deliveries.filter((d) => d.motoristaId === driverId).length
        ).toFixed(2),
      ),
    }));

    return driverAverages;
  }

  private async getNotesByRegion(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter: string,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(driverIdFilter && { driverId: driverIdFilter }),
      },
      select: {
        cidade: true,
        cep: true,
      },
    });

    const directions = await this.prisma.directions.findMany({
      where: {
        tenantId,
      },
      select: {
        rangeInicio: true,
        rangeFim: true,
        regiao: true,
      },
    });

    const regionCounts = orders.reduce(
      (acc, order) => {
        const region = directions.find(
          (direction) =>
            parseInt(order.cep) >= parseInt(direction.rangeInicio) &&
            parseInt(order.cep) <= parseInt(direction.rangeFim),
        );
        const regionName = region ? region.regiao : 'Unknown';
        acc[regionName] = (acc[regionName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(regionCounts).map((region) => ({
      region,
      count: regionCounts[region],
    }));
  }
}
