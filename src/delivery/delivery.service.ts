import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import {
  OrderStatus,
  DeliveryStatus,
  ApprovalAction,
} from '../types/status.enum';
import { Order, Tenant } from '@prisma/client';

@Injectable()
export class DeliveryService {
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

  private async getDriverByUserId(
    userId: string,
  ): Promise<{ id: string; tenantId: string }> {
    const driver = await this.prisma.driver.findFirst({
      where: { userId },
      select: { id: true, tenantId: true },
    });
    if (!driver) {
      throw new NotFoundException(
        'Perfil de motorista não encontrado para este usuário.',
      );
    }
    return driver;
  }

  private isValidOrderStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.EM_ROTA]: [OrderStatus.EM_ENTREGA],
      [OrderStatus.EM_ENTREGA]: [
        OrderStatus.ENTREGUE,
        OrderStatus.NAO_ENTREGUE,
      ],
    };
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async checkTenantRulesForAutoApproval(
    tenant: Tenant,
    totalValor: number,
    totalPeso: number,
    ordersCount: number,
    valorFrete: number,
  ): Promise<{ needsApproval: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    if (tenant.minDeliveryPercentage !== null && totalValor > 0) {
      const freightPercentage = (valorFrete / totalValor) * 100;
      if (freightPercentage > tenant.minDeliveryPercentage) {
        reasons.push(
          `Percentual de frete (${freightPercentage.toFixed(2)}%) acima do máximo permitido (${tenant.minDeliveryPercentage}%).`,
        );
      }
    }
    if (tenant.minValue !== null && totalValor < tenant.minValue) {
      reasons.push(
        `Valor total da mercadoria (R$ ${totalValor.toFixed(2)}) abaixo do mínimo exigido (R$ ${tenant.minValue.toFixed(2)}).`,
      );
    }
    if (tenant.minPeso !== null && totalPeso < tenant.minPeso) {
      reasons.push(
        `Peso total (${totalPeso.toFixed(2)} kg) abaixo do mínimo exigido (${tenant.minPeso.toFixed(2)} kg).`,
      );
    }
    if (tenant.minOrders !== null && ordersCount < tenant.minOrders) {
      reasons.push(
        `Quantidade de pedidos (${ordersCount}) abaixo do mínimo exigido (${tenant.minOrders}).`,
      );
    }

    return { needsApproval: reasons.length > 0, reasons };
  }

  async create(createDeliveryDto: CreateDeliveryDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const {
      motoristaId,
      orders: orderReferences,
      veiculoId,
      observacao,
      dataInicio,
    } = createDeliveryDto;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const driver = await this.prisma.driver.findFirst({
      where: { id: motoristaId, tenantId },
    });
    if (!driver)
      throw new NotFoundException(
        `Motorista com ID ${motoristaId} não encontrado ou não pertence ao seu tenant.`,
      );

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: veiculoId, tenantId },
    });
    if (!vehicle)
      throw new NotFoundException(
        `Veículo com ID ${veiculoId} não encontrado ou não pertence ao seu tenant.`,
      );

    const existingDeliveryForDriver = await this.prisma.delivery.findFirst({
      where: {
        motoristaId,
        tenantId,
        status: { in: [DeliveryStatus.INICIADO, DeliveryStatus.A_LIBERAR] },
      },
    });
    if (existingDeliveryForDriver) {
      throw new ConflictException(
        `Motorista ${driver.name} já possui um roteiro '${existingDeliveryForDriver.status}' (ID: ${existingDeliveryForDriver.id}).`,
      );
    }

    const orderIds = orderReferences.map((order) => order.id);
    const orderRecords = await this.prisma.order.findMany({
      where: { id: { in: orderIds }, tenantId },
    });

    if (orderRecords.length !== orderIds.length) {
      const foundIds = orderRecords.map((o) => o.id);
      const notFoundIds = orderIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Pedidos não encontrados ou não pertencem ao tenant: ${notFoundIds.join(', ')}.`,
      );
    }

    const ordersNotAvailable = orderRecords.filter(
      (o) => o.status !== OrderStatus.SEM_ROTA,
    );
    if (ordersNotAvailable.length > 0) {
      throw new BadRequestException(
        `Os seguintes pedidos não estão com status '${OrderStatus.SEM_ROTA}': ` +
          ordersNotAvailable
            .map((o) => `${o.numero} (status: ${o.status})`)
            .join(', '),
      );
    }

    const totalPeso = orderRecords.reduce(
      (sum, order) => sum + (order.peso || 0),
      0,
    );
    const totalValor = orderRecords.reduce(
      (sum, order) => sum + (order.valor || 0),
      0,
    );
    const valorFrete = await this.calculateFreight(
      orderRecords,
      veiculoId,
      tenantId,
    );

    const approvalCheck = await this.checkTenantRulesForAutoApproval(
      tenant,
      totalValor,
      totalPeso,
      orderRecords.length,
      valorFrete,
    );

    const initialDeliveryStatus = approvalCheck.needsApproval
      ? DeliveryStatus.A_LIBERAR
      : DeliveryStatus.INICIADO;
    const initialOrderStatus = approvalCheck.needsApproval
      ? OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO
      : OrderStatus.EM_ROTA;

    const result = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.create({
        data: {
          motoristaId,
          veiculoId,
          tenantId,
          valorFrete,
          totalPeso,
          totalValor,
          status: initialDeliveryStatus,
          dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
          observacao: observacao || '',
          orders: {
            connect: orderReferences.map((order) => ({ id: order.id })),
          },
        },
        include: { orders: true, Driver: true, Vehicle: true },
      });

      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          status: initialOrderStatus,
          deliveryId: delivery.id,
          startedAt: null,
          completedAt: null,
          motivoNaoEntrega: null,
          codigoMotivoNaoEntrega: null,
        },
      });

      for (const orderRef of orderReferences) {
        await tx.order.update({
          where: { id: orderRef.id },
          data: {
            sorting: orderRef.sorting !== undefined ? orderRef.sorting : null,
          },
        });
      }
      return delivery;
    });

    let message = `Roteiro criado com status '${initialDeliveryStatus}'.`;
    if (approvalCheck.needsApproval) {
      message += ` Necessita liberação pelos seguintes motivos: ${approvalCheck.reasons.join('; ')}`;
    }

    return {
      message,
      delivery: result,
      needsApproval: approvalCheck.needsApproval,
      approvalReasons: approvalCheck.reasons,
    };
  }

  async calculateFreightPreview(
    dto: { orderIds: string[]; vehicleId: string },
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const { orderIds, vehicleId } = dto;

    const orderRecords = await this.prisma.order.findMany({
      where: { id: { in: orderIds }, tenantId },
    });

    if (orderRecords.length !== orderIds.length) {
      throw new BadRequestException(
        `Um ou mais pedidos não foram encontrados.`,
      );
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });
    if (!vehicle) {
      throw new NotFoundException(
        `Veículo com ID ${vehicleId} não encontrado ou não pertence ao seu tenant.`,
      );
    }

    const freightValue = await this.calculateFreight(
      orderRecords,
      vehicleId,
      tenantId,
    );

    return { calculatedFreight: freightValue };
  }

  private async calculateFreight(
    orders: Order[],
    veiculoId: string,
    tenantId: string,
  ): Promise<number> {
    let maxDirectionValue = 0;
    for (const order of orders) {
      const directionValue = await this.prisma.directions.findFirst({
        where: {
          tenantId,
          rangeInicio: { lte: order.cep },
          rangeFim: { gte: order.cep },
        },
        orderBy: { valorDirecao: 'desc' },
      });
      if (
        directionValue &&
        Number(directionValue.valorDirecao) > maxDirectionValue
      ) {
        maxDirectionValue = Number(directionValue.valorDirecao);
      }
    }
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: veiculoId },
      include: { Category: true },
    });
    // Adicionar verificação de tenantId para o veículo também aqui, para segurança extra
    if (!vehicle || vehicle.tenantId !== tenantId) {
      throw new BadRequestException(
        'Veículo não encontrado ou não pertence ao seu tenant.',
      );
    }
    return maxDirectionValue + (vehicle?.Category?.valor ?? 0);
  }

  async liberarRoteiro(deliveryId: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: { orders: true },
    });

    if (!delivery)
      throw new NotFoundException(
        `Roteiro com ID ${deliveryId} não encontrado ou não pertence ao seu tenant.`,
      );
    if (delivery.status !== DeliveryStatus.A_LIBERAR) {
      throw new BadRequestException(
        `Roteiro ${deliveryId} não está aguardando liberação (status atual: ${delivery.status}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.INICIADO,
          dataLiberacao: new Date(),
        },
        include: { orders: true, Driver: true, Vehicle: true },
      });

      await tx.order.updateMany({
        where: {
          deliveryId: deliveryId,
          status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO,
        },
        data: { status: OrderStatus.EM_ROTA },
      });

      await tx.approval.create({
        data: {
          deliveryId,
          tenantId,
          userId,
          action: ApprovalAction.APPROVED,
          createdAt: new Date(),
        },
      });
      return {
        message: 'Roteiro liberado com sucesso!',
        delivery: updatedDelivery,
      };
    });
  }

  async rejeitarRoteiro(deliveryId: string, userId: string, motivo: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: { orders: true },
    });

    if (!delivery)
      throw new NotFoundException(
        `Roteiro com ID ${deliveryId} não encontrado ou não pertence ao seu tenant.`,
      );
    if (delivery.status !== DeliveryStatus.A_LIBERAR) {
      throw new BadRequestException(
        `Roteiro ${deliveryId} não pode ser rejeitado (status atual: ${delivery.status}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.REJEITADO },
        include: { orders: true, Driver: true, Vehicle: true },
      });

      await tx.order.updateMany({
        where: {
          deliveryId: deliveryId,
          status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO,
        },
        data: { status: OrderStatus.SEM_ROTA, deliveryId: null, sorting: null },
      });

      await tx.approval.create({
        data: {
          deliveryId,
          tenantId,
          userId,
          action: ApprovalAction.REJECTED,
          motivo,
          createdAt: new Date(),
        },
      });

      if (updatedDelivery.status === DeliveryStatus.REJEITADO) {
        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            orders: { disconnect: delivery.orders.map((o) => ({ id: o.id })) },
          },
        });
      }

      return {
        message: `Roteiro rejeitado com sucesso. Pedidos retornaram para '${OrderStatus.SEM_ROTA}'.`,
        delivery: updatedDelivery,
      };
    });
  }

  async updateOrderStatus(
    orderId: string,
    newStatus:
      | OrderStatus.EM_ENTREGA
      | OrderStatus.ENTREGUE
      | OrderStatus.NAO_ENTREGUE,
    userId: string, // Recebe userId do controller
    motivoNaoEntrega?: string,
    codigoMotivoNaoEntrega?: string,
  ) {
    const driver = await this.getDriverByUserId(userId); // Obtém driverId e tenantId do usuário logado
    const tenantId = driver.tenantId; // tenantId seguro

    if (
      ![
        OrderStatus.EM_ENTREGA,
        OrderStatus.ENTREGUE,
        OrderStatus.NAO_ENTREGUE,
      ].includes(newStatus)
    ) {
      throw new BadRequestException(`Status inválido: ${newStatus}.`);
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId }, // Filtra por tenantId
      include: { Delivery: true },
    });

    if (!order)
      throw new NotFoundException(
        `Pedido ${orderId} não encontrado ou não pertence ao seu tenant.`,
      );
    if (!order.Delivery)
      throw new BadRequestException(
        `Pedido ${order.numero} não está em um roteiro.`,
      );
    if (order.Delivery.status !== DeliveryStatus.INICIADO) {
      throw new BadRequestException(
        `Roteiro ${order.Delivery.id} não está '${DeliveryStatus.INICIADO}'. Status atual: ${order.Delivery.status}.`,
      );
    }
    if (order.Delivery.motoristaId !== driver.id) {
      // Usa driver.id (do usuário logado)
      throw new ForbiddenException(
        'Motorista não autorizado para este roteiro.',
      );
    }
    if (
      !this.isValidOrderStatusTransition(order.status as OrderStatus, newStatus)
    ) {
      throw new BadRequestException(
        `Transição inválida de "${order.status}" para "${newStatus}".`,
      );
    }

    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
      driverId: driver.id, // Define o driverId com base no usuário logado
    };

    if (newStatus === OrderStatus.EM_ENTREGA) {
      updateData.startedAt = new Date();
      updateData.completedAt = null;
      updateData.motivoNaoEntrega = null;
      updateData.codigoMotivoNaoEntrega = null;
    } else if (newStatus === OrderStatus.ENTREGUE) {
      updateData.completedAt = new Date();
      if (!order.startedAt) updateData.startedAt = new Date();
    } else if (newStatus === OrderStatus.NAO_ENTREGUE) {
      if (!motivoNaoEntrega)
        throw new BadRequestException('Motivo da não entrega é obrigatório.');
      updateData.completedAt = new Date();
      updateData.motivoNaoEntrega = motivoNaoEntrega;
      updateData.codigoMotivoNaoEntrega = codigoMotivoNaoEntrega;
      if (!order.startedAt) updateData.startedAt = new Date();
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const orderAfterUpdate = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      const deliveryId = orderAfterUpdate.deliveryId;
      if (deliveryId) {
        const ordersInDelivery = await tx.order.findMany({
          where: { deliveryId },
        });
        const allOrdersFinalized = ordersInDelivery.every(
          (o) =>
            o.status === OrderStatus.ENTREGUE ||
            o.status === OrderStatus.NAO_ENTREGUE,
        );
        if (allOrdersFinalized) {
          await tx.delivery.update({
            where: { id: deliveryId },
            data: { status: DeliveryStatus.FINALIZADO, dataFim: new Date() },
          });
        }
      }
      return orderAfterUpdate;
    });

    return updatedOrder;
  }

  async update(
    id: string,
    updateDeliveryDto: UpdateDeliveryDto,
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const {
      motoristaId,
      veiculoId,
      orders: orderReferences,
      status: newDeliveryStatusRequest,
      observacao,
      dataInicio,
    } = updateDeliveryDto;

    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId },
      include: { orders: true, approvals: { orderBy: { createdAt: 'desc' } } },
    });

    if (!delivery)
      throw new NotFoundException(
        `Roteiro ${id} não encontrado ou não pertence ao seu tenant.`,
      );

    if (
      [DeliveryStatus.FINALIZADO, DeliveryStatus.REJEITADO].includes(
        delivery.status as DeliveryStatus,
      )
    ) {
      if (
        observacao !== undefined &&
        Object.keys(updateDeliveryDto).length === 1
      ) {
        const updatedObs = await this.prisma.delivery.update({
          where: { id },
          data: { observacao },
        });
        return {
          message: 'Observação do roteiro atualizada.',
          delivery: updatedObs,
        };
      }
      throw new BadRequestException(
        `Roteiro ${id} está '${delivery.status}' e não pode ser modificado significativamente.`,
      );
    }

    const updateData: any = { updatedAt: new Date() };

    if (motoristaId && motoristaId !== delivery.motoristaId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: motoristaId, tenantId },
      });
      if (!driver)
        throw new NotFoundException(
          `Novo motorista ${motoristaId} não encontrado ou não pertence ao seu tenant.`,
        );
      const existingDeliveryForNewDriver = await this.prisma.delivery.findFirst(
        {
          where: {
            motoristaId,
            tenantId,
            status: { in: [DeliveryStatus.INICIADO, DeliveryStatus.A_LIBERAR] },
            id: { not: id },
          },
        },
      );
      if (existingDeliveryForNewDriver) {
        throw new ConflictException(
          `Novo motorista ${driver.name} já possui um roteiro '${existingDeliveryForNewDriver.status}' (ID: ${existingDeliveryForNewDriver.id}).`,
        );
      }
      updateData.motoristaId = motoristaId;
    }
    if (veiculoId && veiculoId !== delivery.veiculoId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: veiculoId, tenantId },
      });
      if (!vehicle)
        throw new NotFoundException(
          `Novo veículo ${veiculoId} não encontrado ou não pertence ao seu tenant.`,
        );
      updateData.veiculoId = veiculoId;
    }
    if (observacao !== undefined) updateData.observacao = observacao;
    if (dataInicio) updateData.dataInicio = new Date(dataInicio);

    if (
      newDeliveryStatusRequest &&
      newDeliveryStatusRequest !== delivery.status
    ) {
      if (
        newDeliveryStatusRequest === DeliveryStatus.A_LIBERAR &&
        delivery.status === DeliveryStatus.INICIADO
      ) {
        updateData.status = DeliveryStatus.A_LIBERAR;
      } else if (
        [DeliveryStatus.FINALIZADO, DeliveryStatus.REJEITADO].includes(
          newDeliveryStatusRequest as DeliveryStatus,
        )
      ) {
        throw new BadRequestException(
          `Não é possível alterar o status para '${newDeliveryStatusRequest}' através desta rota. Use os fluxos específicos.`,
        );
      } else {
        updateData.status = newDeliveryStatusRequest;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let newOrderStatusForAddedItems =
        delivery.status === DeliveryStatus.A_LIBERAR
          ? OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO
          : OrderStatus.EM_ROTA;
      if (updateData.status === DeliveryStatus.A_LIBERAR)
        newOrderStatusForAddedItems = OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO;
      else if (updateData.status === DeliveryStatus.INICIADO)
        newOrderStatusForAddedItems = OrderStatus.EM_ROTA;

      if (orderReferences) {
        const currentOrderIds = delivery.orders.map((o) => o.id);
        const newOrderIdsFromRequest = orderReferences.map((or) => or.id);

        const ordersToAddRefs = orderReferences.filter(
          (or) => !currentOrderIds.includes(or.id),
        );
        const ordersToRemoveIds = currentOrderIds.filter(
          (id) => !newOrderIdsFromRequest.includes(id),
        );

        if (ordersToAddRefs.length > 0) {
          const ordersToAddRecords = await tx.order.findMany({
            where: {
              id: { in: ordersToAddRefs.map((or) => or.id) },
              tenantId,
              status: OrderStatus.SEM_ROTA,
            },
          });
          if (ordersToAddRecords.length !== ordersToAddRefs.length) {
            throw new BadRequestException(
              "Alguns pedidos a serem adicionados não existem ou não estão no status 'Sem rota'.",
            );
          }
          await tx.order.updateMany({
            where: { id: { in: ordersToAddRecords.map((o) => o.id) } },
            data: {
              deliveryId: id,
              status: newOrderStatusForAddedItems,
              startedAt: null,
              completedAt: null,
            },
          });
        }
        if (ordersToRemoveIds.length > 0) {
          await tx.order.updateMany({
            where: { id: { in: ordersToRemoveIds }, deliveryId: id },
            data: {
              deliveryId: null,
              status: OrderStatus.SEM_ROTA,
              sorting: null,
              startedAt: null,
              completedAt: null,
            },
          });
        }

        updateData.orders = {
          set: orderReferences.map((or) => ({ id: or.id })),
        };

        for (const orderRef of orderReferences) {
          await tx.order.update({
            where: { id: orderRef.id },
            data: {
              sorting: orderRef.sorting !== undefined ? orderRef.sorting : null,
            },
          });
        }
      }
      const finalOrderIdsInDelivery = orderReferences
        ? orderReferences.map((or) => or.id)
        : delivery.orders.map((o) => o.id);
      const finalOrdersInDelivery = await tx.order.findMany({
        where: { id: { in: finalOrderIdsInDelivery } },
      });
      updateData.totalPeso = finalOrdersInDelivery.reduce(
        (sum, order) => sum + (order.peso || 0),
        0,
      );
      updateData.totalValor = finalOrdersInDelivery.reduce(
        (sum, order) => sum + (order.valor || 0),
        0,
      );
      updateData.valorFrete = await this.calculateFreight(
        finalOrdersInDelivery,
        updateData.veiculoId || delivery.veiculoId,
        tenantId,
      );

      const tenantData = await tx.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenantData && delivery.status === DeliveryStatus.INICIADO) {
        const approvalCheckAfterUpdate =
          await this.checkTenantRulesForAutoApproval(
            tenantData,
            updateData.totalValor,
            updateData.totalPeso,
            finalOrdersInDelivery.length,
            updateData.valorFrete,
          );
        if (approvalCheckAfterUpdate.needsApproval) {
          updateData.status = DeliveryStatus.A_LIBERAR;
          await tx.order.updateMany({
            where: { deliveryId: id, status: OrderStatus.EM_ROTA },
            data: { status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO },
          });
          await tx.approval.create({
            data: {
              deliveryId: id,
              tenantId,
              userId,
              action: 'RE_APPROVAL_NEEDED',
              motivo: `Alterações no roteiro (${approvalCheckAfterUpdate.reasons.join('; ')}) exigem nova liberação.`,
              createdAt: new Date(),
            },
          });
        }
      }

      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: updateData,
        include: {
          orders: { orderBy: { sorting: 'asc' } },
          Driver: true,
          Vehicle: true,
          approvals: {
            include: { User: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return {
        message: 'Roteiro atualizado com sucesso.',
        delivery: updatedDelivery,
      };
    });
  }

  async findAllByUserIdAndRole(userId: string, userRole: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const whereClause: any = {
      tenantId,
      status: { not: DeliveryStatus.REJEITADO },
    };

    if (userRole === 'driver') {
      const driver = await this.getDriverByUserId(userId);
      whereClause.motoristaId = driver.id;
    }

    return this.prisma.delivery.findMany({
      where: whereClause,
      include: {
        orders: { orderBy: { sorting: 'asc' } },
        Driver: true,
        Vehicle: true,
        approvals: { include: { User: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { dataInicio: 'desc' },
    });
  }

  async findOneByIdAndUserIdAndRole(
    id: string,
    userId: string,
    userRole: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const whereClause: any = { id, tenantId };

    if (userRole === 'driver') {
      const driver = await this.getDriverByUserId(userId);
      whereClause.motoristaId = driver.id; // Garante que o motorista só acesse seus próprios roteiros
    }

    const delivery = await this.prisma.delivery.findFirst({
      where: whereClause,
      include: {
        orders: { orderBy: { sorting: 'asc' } },
        Driver: true,
        Vehicle: true,
        approvals: { include: { User: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!delivery)
      throw new NotFoundException(
        `Roteiro ${id} não encontrado ou não pertence ao seu tenant.`,
      );
    return delivery;
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.findOneByIdAndUserIdAndRole(
      id,
      userId,
      'admin',
    ); // Passa 'admin' aqui para ignorar a restrição de motorista no findOne

    if (delivery.status === DeliveryStatus.INICIADO) {
      const hasNonFinalizedOrders = delivery.orders.some(
        (o) =>
          o.status === OrderStatus.EM_ENTREGA ||
          o.status === OrderStatus.EM_ROTA,
      );
      if (hasNonFinalizedOrders) {
        throw new BadRequestException(
          `Não é possível excluir um roteiro '${DeliveryStatus.INICIADO}' com pedidos ativos ou em entrega. Conclua ou remova os pedidos primeiro.`,
        );
      }
    }

    const hasPayments = await this.prisma.accountsPayable.findFirst({
      where: {
        paymentDeliveries: { some: { deliveryId: id } },
        status: 'Baixado',
        tenantId, // Filtra por tenantId para segurança
      },
    });
    if (hasPayments)
      throw new BadRequestException(
        'Não é possível excluir roteiro com pagamentos baixados.',
      );

    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { deliveryId: id, tenantId }, // Filtra por tenantId
        data: {
          status: OrderStatus.SEM_ROTA,
          deliveryId: null,
          sorting: null,
          startedAt: null,
          completedAt: null,
          motivoNaoEntrega: null,
          codigoMotivoNaoEntrega: null,
        },
      });
      await tx.paymentDelivery.deleteMany({
        where: { deliveryId: id, tenantId },
      }); // Filtra por tenantId
      await tx.approval.deleteMany({ where: { deliveryId: id, tenantId } }); // Filtra por tenantId
      await tx.delivery.delete({ where: { id, tenantId } }); // Filtra por tenantId
    });

    return {
      message:
        'Roteiro removido com sucesso. Pedidos desvinculados e aprovações limpas.',
    };
  }

  async removeOrderFromDelivery(
    deliveryId: string,
    orderId: string,
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: { orders: true },
    });

    if (!delivery)
      throw new NotFoundException(
        `Roteiro ${deliveryId} não encontrado ou não pertence ao seu tenant.`,
      );
    if (
      [DeliveryStatus.FINALIZADO, DeliveryStatus.REJEITADO].includes(
        delivery.status as DeliveryStatus,
      )
    ) {
      throw new BadRequestException(
        `Não é possível remover pedidos de um roteiro '${delivery.status}'.`,
      );
    }

    const order = delivery.orders.find((o) => o.id === orderId);
    if (!order)
      throw new NotFoundException(
        `Pedido ${orderId} não encontrado neste roteiro.`,
      );

    if (
      [
        OrderStatus.ENTREGUE,
        OrderStatus.NAO_ENTREGUE,
        OrderStatus.EM_ENTREGA,
      ].includes(order.status as OrderStatus)
    ) {
      throw new BadRequestException(
        `Pedido ${order.numero} está '${order.status}' e não pode ser removido diretamente. Reverta o status primeiro se necessário.`,
      );
    }

    const updatedDelivery = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId, tenantId }, // Filtra por tenantId
        data: {
          status: OrderStatus.SEM_ROTA,
          deliveryId: null,
          sorting: null,
          startedAt: null,
          completedAt: null,
          motivoNaoEntrega: null,
          codigoMotivoNaoEntrega: null,
        },
      });

      const deliveryAfterUpdate = await tx.delivery.update({
        where: { id: deliveryId, tenantId }, // Filtra por tenantId
        data: { orders: { disconnect: { id: orderId } } },
        include: { orders: { orderBy: { sorting: 'asc' } } },
      });

      const tenantData = await tx.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenantData) {
        const finalOrdersInDelivery = deliveryAfterUpdate.orders;
        const totalPeso = finalOrdersInDelivery.reduce(
          (sum, o) => sum + (o.peso || 0),
          0,
        );
        const totalValor = finalOrdersInDelivery.reduce(
          (sum, o) => sum + (o.valor || 0),
          0,
        );
        const valorFrete = await this.calculateFreight(
          finalOrdersInDelivery,
          delivery.veiculoId,
          tenantId,
        );

        await tx.delivery.update({
          where: { id: deliveryId },
          data: { totalPeso, totalValor, valorFrete },
        });

        if (delivery.status === DeliveryStatus.INICIADO) {
          const approvalCheckAfterUpdate =
            await this.checkTenantRulesForAutoApproval(
              tenantData,
              totalValor,
              totalPeso,
              finalOrdersInDelivery.length,
              valorFrete,
            );
          if (approvalCheckAfterUpdate.needsApproval) {
            await tx.delivery.update({
              where: { id: deliveryId },
              data: { status: DeliveryStatus.A_LIBERAR },
            });
            await tx.order.updateMany({
              where: {
                deliveryId: deliveryId,
                status: OrderStatus.EM_ROTA,
                tenantId,
              }, // Filtra por tenantId
              data: { status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO },
            });
            await tx.approval.create({
              data: {
                deliveryId: deliveryId,
                tenantId,
                userId,
                action: 'RE_APPROVAL_NEEDED',
                motivo: `Remoção do pedido ${order.numero} fez o roteiro (${approvalCheckAfterUpdate.reasons.join('; ')}) exigir nova liberação.`,
                createdAt: new Date(),
              },
            });
          }
        }
        if (
          finalOrdersInDelivery.length === 0 &&
          delivery.status !== DeliveryStatus.A_LIBERAR
        ) {
        }
      }
      return deliveryAfterUpdate;
    });

    return {
      message: `Pedido ${order.numero} removido do roteiro.`,
      delivery: updatedDelivery,
    };
  }
}
