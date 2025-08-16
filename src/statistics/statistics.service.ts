import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, DeliveryStatus, PaymentStatus } from '@prisma/client';

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

  async getAdvancedStatistics(
    userId: string,
    startDate: Date,
    endDate: Date,
    driverId: string = '',
    regionId: string = '',
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const orderFilter = {
      tenantId,
      createdAt: dateFilter,
      ...(driverId && { driverId }),
    };

    const deliveryFilter = {
      tenantId,
      createdAt: dateFilter,
      ...(driverId && { driverId: driverId }),
    };

    const [
      totalPedidos,
      pedidosEntregues,
      pedidosPendentes,
      receitaTotal,
      entregasAtivas,
      pagamentosPagos,
      pagamentosPendentes,
    ] = await Promise.all([
      this.prisma.order.count({
        where: orderFilter,
      }),

      this.prisma.order.count({
        where: {
          ...orderFilter,
          status: OrderStatus.ENTREGUE,
        },
      }),

      this.prisma.order.count({
        where: {
          ...orderFilter,
          status: {
            in: [OrderStatus.EM_ROTA, OrderStatus.EM_ENTREGA],
          },
        },
      }),

      this.prisma.order.count({
        where: {
          ...orderFilter,
          status: OrderStatus.SEM_ROTA,
        },
      }),

      this.prisma.order
        .aggregate({
          where: {
            ...orderFilter,
            status: OrderStatus.ENTREGUE,
          },
          _sum: {
            valor: true,
          },
        })
        .then((result) => result._sum?.valor || 0),

      this.prisma.delivery.count({
        where: {
          ...deliveryFilter,
          status: DeliveryStatus.INICIADO,
        },
      }),

      this.prisma.accountsPayable.count({
        where: {
          tenantId,
          createdAt: dateFilter,
          status: PaymentStatus.PAGO,
          ...(driverId && { driverId: driverId }),
        },
      }),

      this.prisma.accountsPayable.count({
        where: {
          tenantId,
          createdAt: dateFilter,
          status: PaymentStatus.PENDENTE,
          ...(driverId && { driverId: driverId }),
        },
      }),
    ]);

    const performanceMotoristas = await this.getDriverPerformance(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    const analiseRegional = await this.getRegionalAnalysis(
      tenantId,
      startDate,
      endDate,
      driverId,
      regionId,
    );

    const dadosTemporais = await this.getTemporalData(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    const taxaConclusao =
      totalPedidos > 0 ? (pedidosEntregues / totalPedidos) * 100 : 0;
    const performanceMedia = this.calculateAveragePerformance(
      performanceMotoristas,
    );

    const totalPagamentos = pagamentosPagos + pagamentosPendentes;
    const taxaPagamento =
      totalPagamentos > 0 ? (pagamentosPagos / totalPagamentos) * 100 : 0;

    const tempoMedioEntrega = await this.calculateAverageDeliveryTime(
      tenantId,
      startDate,
      endDate,
      driverId,
    );

    return {
      resumoGeral: {
        totalPedidos,
        taxaConclusao: Math.round(taxaConclusao * 100) / 100,
        receitaTotal: receitaTotal,
        performanceMedia: Math.round(performanceMedia * 100) / 100,
        entregasAtivas,
        taxaPagamento: Math.round(taxaPagamento * 100) / 100,
        tempoMedioEntrega: Math.round(tempoMedioEntrega * 100) / 100,
        pedidosPendentes,
      },

      performanceMotoristas,
      analiseRegional,
      dadosTemporais,

      motoristas: await this.getDriversList(tenantId),
      regioes: await this.getRegionsList(tenantId),

      periodo: {
        inicio: startDate.toISOString(),
        fim: endDate.toISOString(),
      },
    };
  }

  private async getDriverPerformance(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter?: string,
  ) {
    const drivers = await this.prisma.driver.findMany({
      where: {
        tenantId,
        ...(driverIdFilter && { id: driverIdFilter }),
      },
      select: {
        id: true,
        name: true,
      },
    });

    const performance = await Promise.all(
      drivers.map(async (driver) => {
        const [
          totalEntregas,
          entregasCompletas,
          entregasNaoCompletas,
          tempoMedio,
          totalGanhos,
        ] = await Promise.all([
          this.prisma.order.count({
            where: {
              tenantId,
              driverId: driver.id,
              createdAt: { gte: startDate, lte: endDate },
            },
          }),

          this.prisma.order.count({
            where: {
              tenantId,
              driverId: driver.id,
              status: OrderStatus.ENTREGUE,
              createdAt: { gte: startDate, lte: endDate },
            },
          }),

          this.prisma.order.count({
            where: {
              tenantId,
              driverId: driver.id,
              status: OrderStatus.NAO_ENTREGUE,
              createdAt: { gte: startDate, lte: endDate },
            },
          }),

          this.calculateDriverAverageTime(
            driver.id,
            tenantId,
            startDate,
            endDate,
          ),

          this.prisma.accountsPayable.aggregate({
            where: {
              tenantId,
              driverId: driver.id,
              status: PaymentStatus.PAGO,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        const taxaSucesso =
          totalEntregas > 0 ? (entregasCompletas / totalEntregas) * 100 : 0;
        const scorePerformance = this.calculatePerformanceScore(
          taxaSucesso,
          tempoMedio,
          totalEntregas,
        );

        return {
          motorista: {
            id: driver.id,
            nome: driver.name,
          },
          tempo_medio_entrega: Math.round(tempoMedio * 100) / 100,
          taxa_sucesso: Math.round(taxaSucesso * 100) / 100,
          total_ganhos: totalGanhos._sum.amount || 0,
          entregas_completadas: entregasCompletas,
          entregas_nao_completadas: entregasNaoCompletas,
          score_performance: Math.round(scorePerformance * 100) / 100,
        };
      }),
    );

    return performance.sort(
      (a, b) => b.score_performance - a.score_performance,
    );
  }

  private async getRegionalAnalysis(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter?: string,
    regionIdFilter?: string,
  ) {
    const directions = await this.prisma.directions.findMany({
      where: {
        tenantId,
        ...(regionIdFilter && { id: regionIdFilter }),
      },
    });

    const regionalData = await Promise.all(
      directions.map(async (direction) => {
        const pedidosRegiao = await this.prisma.order.findMany({
          where: {
            tenantId,
            createdAt: { gte: startDate, lte: endDate },
            ...(driverIdFilter && { driverId: driverIdFilter }),
          },
          select: {
            cep: true,
            valor: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        });

        const pedidosDaRegiao = pedidosRegiao.filter((pedido) => {
          const cepNum = parseInt(pedido.cep.replace(/\D/g, ''));
          const rangeInicioNum = parseInt(
            direction.rangeInicio.replace(/\D/g, ''),
          );
          const rangeFimNum = parseInt(direction.rangeFim.replace(/\D/g, ''));
          return cepNum >= rangeInicioNum && cepNum <= rangeFimNum;
        });

        const totalPedidos = pedidosDaRegiao.length;
        const pedidosEntregues = pedidosDaRegiao.filter(
          (p) => p.status === OrderStatus.ENTREGUE,
        ).length;
        const receitaTotal = pedidosDaRegiao
          .filter((p) => p.status === OrderStatus.ENTREGUE)
          .reduce((sum, p) => sum + p.valor, 0);

        const pedidosComTempo = pedidosDaRegiao.filter(
          (p) =>
            p.startedAt && p.completedAt && p.status === OrderStatus.ENTREGUE,
        );

        const tempoMedio =
          pedidosComTempo.length > 0
            ? pedidosComTempo.reduce((sum, p) => {
                const diffMs =
                  new Date(p.completedAt!).getTime() -
                  new Date(p.startedAt!).getTime();
                return sum + diffMs / (1000 * 60 * 60);
              }, 0) / pedidosComTempo.length
            : 0;

        const taxaSucesso =
          totalPedidos > 0 ? (pedidosEntregues / totalPedidos) * 100 : 0;
        const custoEstimado = totalPedidos * direction.valorDirecao;
        const deficitSuperavit = receitaTotal - custoEstimado;

        return {
          regiao: direction.regiao,
          total_pedidos: totalPedidos,
          receita_total: receitaTotal,
          tempo_medio_entrega: Math.round(tempoMedio * 100) / 100,
          taxa_sucesso: Math.round(taxaSucesso * 100) / 100,
          deficit_superavit: deficitSuperavit,
        };
      }),
    );

    return regionalData.sort((a, b) => b.total_pedidos - a.total_pedidos);
  }

  private async getTemporalData(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter?: string,
  ) {
    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const temporalData = await Promise.all(
      days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const [pedidos, receita, entregas] = await Promise.all([
          this.prisma.order.count({
            where: {
              tenantId,
              createdAt: { gte: day, lt: nextDay },
              ...(driverIdFilter && { driverId: driverIdFilter }),
            },
          }),

          this.prisma.order.aggregate({
            where: {
              tenantId,
              status: OrderStatus.ENTREGUE,
              createdAt: { gte: day, lt: nextDay },
              ...(driverIdFilter && { driverId: driverIdFilter }),
            },
            _sum: { valor: true },
          }),

          this.prisma.delivery.count({
            where: {
              tenantId,
              status: DeliveryStatus.FINALIZADO,
              createdAt: { gte: day, lt: nextDay },
              ...(driverIdFilter && { driverId: driverIdFilter }),
            },
          }),
        ]);

        return {
          data: day.toISOString().split('T')[0],
          pedidos,
          receita: receita._sum.valor || 0,
          entregas,
        };
      }),
    );

    return temporalData;
  }

  private async calculateDriverAverageTime(
    driverId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        driverId,
        status: OrderStatus.ENTREGUE,
        startedAt: { not: null },
        completedAt: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    if (orders.length === 0) return 0;

    const totalTimeMs = orders.reduce((sum, order) => {
      const diffMs =
        new Date(order.completedAt!).getTime() -
        new Date(order.startedAt!).getTime();
      return sum + diffMs;
    }, 0);

    return totalTimeMs / (orders.length * 1000 * 60 * 60);
  }

  private async calculateAverageDeliveryTime(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    driverIdFilter?: string,
  ): Promise<number> {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: OrderStatus.ENTREGUE,
        startedAt: { not: null },
        completedAt: { not: null },
        createdAt: { gte: startDate, lte: endDate },
        ...(driverIdFilter && { driverId: driverIdFilter }),
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    if (orders.length === 0) return 0;

    const totalTimeMs = orders.reduce((sum, order) => {
      const diffMs =
        new Date(order.completedAt!).getTime() -
        new Date(order.startedAt!).getTime();
      return sum + diffMs;
    }, 0);

    return totalTimeMs / (orders.length * 1000 * 60 * 60);
  }

  private calculatePerformanceScore(
    taxaSucesso: number,
    tempoMedio: number,
    totalEntregas: number,
  ): number {
    const sucessoScore = taxaSucesso;
    const tempoScore = tempoMedio > 0 ? Math.max(0, 100 - tempoMedio * 10) : 0;
    const volumeScore = Math.min(100, totalEntregas * 5);

    return sucessoScore * 0.5 + tempoScore * 0.3 + volumeScore * 0.2;
  }

  private calculateAveragePerformance(performance: any[]): number {
    if (performance.length === 0) return 0;
    const totalScore = performance.reduce(
      (sum, p) => sum + p.score_performance,
      0,
    );
    return totalScore / performance.length;
  }

  private async getDriversList(tenantId: string) {
    return this.prisma.driver.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async getRegionsList(tenantId: string) {
    return this.prisma.directions.findMany({
      where: { tenantId },
      select: {
        id: true,
        regiao: true,
      },
      orderBy: { regiao: 'asc' },
    });
  }

  async getStatistics(
    userId: string,
    startDate: Date,
    endDate: Date,
    driverId: string,
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
        ...(driverId && { driverId: driverId }),
      },
    });

    const freightsPaid = await this.prisma.accountsPayable.count({
      where: {
        tenantId,
        status: PaymentStatus.PAGO,
        createdAt: dateFilter,
        ...(driverId && { driverId: driverId }),
      },
    });

    const deliveriesByDriver = await this.prisma.delivery.groupBy({
      by: ['driverId'],
      where: {
        tenantId,
        createdAt: dateFilter,
        ...(driverId && { driverId: driverId }),
      },
      _count: {
        driverId: true,
      },
    });

    const deliveriesInRoute = await this.prisma.delivery.count({
      where: {
        tenantId,
        status: DeliveryStatus.INICIADO,
        createdAt: dateFilter,
        ...(driverId && { driverId: driverId }),
      },
    });

    const deliveriesFinalized = await this.prisma.delivery.count({
      where: {
        tenantId,
        status: DeliveryStatus.FINALIZADO,
        createdAt: dateFilter,
        ...(driverId && { driverId: driverId }),
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
        ...(driverIdFilter && { driverId: driverIdFilter }),
      },
      select: {
        driverId: true,
        orders: {
          select: {
            id: true,
          },
        },
      },
    });

    const driverOrders = deliveries.reduce(
      (acc, delivery) => {
        acc[delivery.driverId] =
          (acc[delivery.driverId] || 0) + delivery.orders.length;
        return acc;
      },
      {} as Record<string, number>,
    );

    const driverAverages = Object.keys(driverOrders).map((driverId) => ({
      driverId,
      average: parseFloat(
        (
          driverOrders[driverId] /
          deliveries.filter((d) => d.driverId === driverId).length
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
        ...(driverIdFilter && { driverId: driverIdFilter }),
      },
      select: {
        driverId: true,
        orders: {
          select: {
            valor: true,
          },
        },
      },
    });

    const driverValues = deliveries.reduce(
      (acc, delivery) => {
        acc[delivery.driverId] =
          (acc[delivery.driverId] || 0) +
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
          deliveries.filter((d) => d.driverId === driverId).length
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
        ...(driverIdFilter && { driverId: driverIdFilter }),
      },
      select: {
        driverId: true,
        orders: {
          select: {
            peso: true,
          },
        },
      },
    });

    const driverWeights = deliveries.reduce(
      (acc, delivery) => {
        acc[delivery.driverId] =
          (acc[delivery.driverId] || 0) +
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
          deliveries.filter((d) => d.driverId === driverId).length
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
