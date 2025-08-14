import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { PaymentsService } from 'src/payments/payments.service';
import {
  OrderStatus,
  DeliveryStatus,
  ApprovalAction,
  Prisma,
  PaymentStatus,
} from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

import {
  FREIGHT_CALCULATOR_PROVIDER,
  IFreightCalculator,
} from './providers/freight-calculator.interface';
import {
  DELIVERY_RULES_VALIDATOR_PROVIDER,
  IDeliveryRulesValidator,
} from './providers/delivery-rules.validator.interface';
import {
  AUDIT_PROVIDER,
  IAuditProvider,
} from '../infrastructure/audit/audit.interface';
import {
  INotificationProvider,
  NOTIFICATION_PROVIDER,
} from '../infrastructure/notifications/notification.interface';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FREIGHT_CALCULATOR_PROVIDER)
    private readonly freightCalculator: IFreightCalculator,
    @Inject(DELIVERY_RULES_VALIDATOR_PROVIDER)
    private readonly rulesValidator: IDeliveryRulesValidator,
    @Inject(AUDIT_PROVIDER) private readonly auditProvider: IAuditProvider,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly notificationProvider: INotificationProvider,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

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

  private async getDriverUserId(driverId: string): Promise<string | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { userId: true },
    });
    return driver?.userId || null;
  }

  private async getAdminUsers(tenantId: string): Promise<string[]> {
    const adminUsers = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { name: { in: ['admin', 'user'] } },
        isActive: true,
      },
      select: { id: true },
    });
    return adminUsers.map((user) => user.id);
  }

  private isValidOrderStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      EM_ROTA: [OrderStatus.EM_ENTREGA],
      EM_ENTREGA: [OrderStatus.ENTREGUE, OrderStatus.NAO_ENTREGUE],
    };
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async sendNotificationsAsync(
    notifications: Array<() => Promise<void>>,
  ): Promise<void> {
    setImmediate(async () => {
      try {
        const notificationPromises = notifications.map(async (notifyFn) => {
          try {
            await notifyFn();
          } catch (error) {
            // Silent error handling
          }
        });
        await Promise.allSettled(notificationPromises);
      } catch (error) {
        // Silent error handling
      }
    });
  }

  async create(createDeliveryDto: CreateDeliveryDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const {
      driverId,
      orders: orderRefs,
      vehicleId,
      observacao,
      dataInicio,
    } = createDeliveryDto;

    const [tenant, driver, vehicle] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.driver.findFirst({ where: { id: driverId, tenantId } }),
      this.prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId } }),
    ]);

    if (!tenant) throw new NotFoundException('Tenant não encontrado.');
    if (!driver) throw new NotFoundException('Motorista não encontrado.');
    if (!vehicle) throw new NotFoundException('Veículo não encontrado.');

    const orderIds = orderRefs.map((order) => order.id);
    const orderRecords = await this.prisma.order.findMany({
      where: { id: { in: orderIds }, tenantId, status: OrderStatus.SEM_ROTA },
    });

    if (orderRecords.length !== orderIds.length) {
      throw new BadRequestException(
        'Um ou mais pedidos não estão disponíveis para roteirização.',
      );
    }

    const valorFrete = await this.freightCalculator.calculate({
      orders: orderRecords,
      vehicle,
      tenantId,
    });
    const totalPeso = orderRecords.reduce((sum, order) => sum + order.peso, 0);
    const totalValor = orderRecords.reduce(
      (sum, order) => sum + order.valor,
      0,
    );

    const validationResult = await this.rulesValidator.validate({
      tenant,
      totalValor,
      totalPeso,
      ordersCount: orderRecords.length,
      valorFrete,
    });
    const initialDeliveryStatus = validationResult.needsApproval
      ? DeliveryStatus.A_LIBERAR
      : DeliveryStatus.INICIADO;
    const initialOrderStatus = validationResult.needsApproval
      ? OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO
      : OrderStatus.EM_ROTA;

    const delivery = await this.prisma.$transaction(async (tx) => {
      const createdDelivery = await tx.delivery.create({
        data: {
          driverId,
          vehicleId,
          tenantId,
          valorFrete,
          totalPeso,
          totalValor,
          status: initialDeliveryStatus,
          dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
          observacao: observacao || '',
        },
      });
      for (const orderRef of orderRefs) {
        await tx.order.update({
          where: { id: orderRef.id },
          data: {
            status: initialOrderStatus,
            deliveryId: createdDelivery.id,
            sorting: orderRef.sorting,
          },
        });
      }
      return createdDelivery;
    });

    await this.auditProvider.logAction({
      userId,
      tenantId,
      action: 'CREATE_DELIVERY',
      target: { entity: 'Delivery', entityId: delivery.id },
      details: {
        status: initialDeliveryStatus,
        orders: orderIds.length,
        freight: valorFrete,
      },
      timestamp: new Date(),
    });

    if (validationResult.needsApproval) {
      const adminUsers = await this.getAdminUsers(tenantId);
      const notifications = adminUsers.map(
        (adminUserId) => () =>
          this.notificationProvider.send({
            recipient: { userId: adminUserId },
            channels: ['push', 'email'],
            templateId: 'delivery-needs-approval',
            data: {
              deliveryId: delivery.id,
              reasons: validationResult.reasons,
              tenantId,
            },
          }),
      );
      await this.sendNotificationsAsync(notifications);
    }

    return {
      message: `Roteiro criado com status '${initialDeliveryStatus}'.`,
      delivery,
      needsApproval: validationResult.needsApproval,
      approvalReasons: validationResult.reasons,
    };
  }

  async calculateFreightPreview(
    dto: { orderIds: string[]; vehicleId: string },
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const [orders, vehicle] = await Promise.all([
      this.prisma.order.findMany({
        where: { id: { in: dto.orderIds }, tenantId },
      }),
      this.prisma.vehicle.findUnique({
        where: { id: dto.vehicleId, tenantId },
      }),
    ]);

    if (orders.length !== dto.orderIds.length)
      throw new BadRequestException(
        `Um ou mais pedidos não foram encontrados.`,
      );
    if (!vehicle)
      throw new NotFoundException(
        `Veículo com ID ${dto.vehicleId} não encontrado.`,
      );

    const freightValue = await this.freightCalculator.calculate({
      orders,
      vehicle,
      tenantId,
    });
    return { calculatedFreight: freightValue };
  }

  async findAll(
    userId: string,
    search?: string,
    status?: DeliveryStatus,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const where: Prisma.DeliveryWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { driver: { name: { contains: search, mode: 'insensitive' } } },
        { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.dataInicio = {
        gte: startOfDay(new Date(startDate)),
        lte: endOfDay(new Date(endDate)),
      };
    }

    const [deliveries, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          driver: { select: { name: true } },
          vehicle: { select: { model: true, plate: true } },
          _count: { select: { orders: true } },
        },
        orderBy: { dataInicio: 'desc' },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: deliveries,
      total,
      page,
      pageSize,
      lastPage: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId },
      include: {
        driver: true,
        vehicle: true,
        orders: { orderBy: { sorting: 'asc' } },
        approvals: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Entrega com ID ${id} não encontrada.`);
    }
    return delivery;
  }

  async liberarRoteiro(deliveryId: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: { driver: { select: { name: true, userId: true } } },
    });

    if (!delivery) throw new NotFoundException('Roteiro não encontrado.');
    if (delivery.status !== DeliveryStatus.A_LIBERAR)
      throw new BadRequestException(`Roteiro não está aguardando liberação.`);

    const [updatedDelivery] = await this.prisma.$transaction([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.INICIADO, dataLiberacao: new Date() },
      }),
      this.prisma.order.updateMany({
        where: {
          deliveryId: deliveryId,
          status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO,
        },
        data: { status: OrderStatus.EM_ROTA },
      }),
      this.prisma.approval.create({
        data: { deliveryId, tenantId, userId, action: ApprovalAction.APPROVED },
      }),
    ]);

    await this.auditProvider.logAction({
      userId,
      tenantId,
      action: 'APPROVE_DELIVERY',
      target: { entity: 'Delivery', entityId: deliveryId },
      timestamp: new Date(),
    });

    if (delivery.driver.userId) {
      const notifications = [
        () =>
          this.notificationProvider.send({
            recipient: { userId: delivery.driver.userId },
            channels: ['push', 'sms'],
            templateId: 'delivery-approved-for-driver',
            data: {
              deliveryId,
              driverName: delivery.driver.name,
              tenantId,
            },
          }),
      ];
      await this.sendNotificationsAsync(notifications);
    }

    return {
      message: 'Roteiro liberado com sucesso!',
      delivery: updatedDelivery,
    };
  }

  async rejeitarRoteiro(deliveryId: string, userId: string, motivo: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: { driver: { select: { name: true, userId: true } } },
    });

    if (!delivery) throw new NotFoundException('Roteiro não encontrado.');
    if (delivery.status !== DeliveryStatus.A_LIBERAR)
      throw new BadRequestException('Roteiro não pode ser rejeitado.');

    const [updatedDelivery] = await this.prisma.$transaction([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.REJEITADO, orders: { set: [] } },
      }),
      this.prisma.order.updateMany({
        where: { deliveryId: deliveryId },
        data: { status: OrderStatus.SEM_ROTA, deliveryId: null, sorting: null },
      }),
      this.prisma.approval.create({
        data: {
          deliveryId,
          tenantId,
          userId,
          action: ApprovalAction.REJECTED,
          motivo,
        },
      }),
    ]);

    await this.auditProvider.logAction({
      userId,
      tenantId,
      action: 'REJECT_DELIVERY',
      target: { entity: 'Delivery', entityId: deliveryId },
      details: { reason: motivo },
      timestamp: new Date(),
    });

    if (delivery.driver.userId) {
      const notifications = [
        () =>
          this.notificationProvider.send({
            recipient: { userId: delivery.driver.userId },
            channels: ['push', 'email'],
            templateId: 'delivery-rejected',
            data: {
              deliveryId,
              reason: motivo,
              driverName: delivery.driver.name,
              tenantId,
            },
          }),
      ];
      await this.sendNotificationsAsync(notifications);
    }

    return {
      message: 'Roteiro rejeitado com sucesso.',
      delivery: updatedDelivery,
    };
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
    motivoNaoEntrega?: string,
    codigoMotivoNaoEntrega?: string,
  ) {
    const driver = await this.getDriverByUserId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: driver.tenantId },
      include: {
        delivery: {
          include: {
            driver: { select: { name: true } },
          },
        },
      },
    });

    if (!order)
      throw new NotFoundException(`Pedido ${orderId} não encontrado.`);
    if (!order.delivery || order.delivery.driverId !== driver.id)
      throw new ForbiddenException(
        'Motorista não autorizado para este roteiro.',
      );
    if (order.delivery.status !== DeliveryStatus.INICIADO)
      throw new BadRequestException(
        `Roteiro não está '${DeliveryStatus.INICIADO}'.`,
      );
    if (!this.isValidOrderStatusTransition(order.status, newStatus))
      throw new BadRequestException(
        `Transição inválida de "${order.status}" para "${newStatus}".`,
      );

    const updateData: Prisma.OrderUpdateInput = { status: newStatus };
    if (newStatus === OrderStatus.EM_ENTREGA) {
      updateData.startedAt = new Date();
    } else if (
      newStatus === OrderStatus.ENTREGUE ||
      newStatus === OrderStatus.NAO_ENTREGUE
    ) {
      updateData.completedAt = new Date();
      if (newStatus === OrderStatus.NAO_ENTREGUE) {
        if (!motivoNaoEntrega)
          throw new BadRequestException('Motivo da não entrega é obrigatório.');
        updateData.motivoNaoEntrega = motivoNaoEntrega;
        updateData.codigoMotivoNaoEntrega = codigoMotivoNaoEntrega;
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    const unfinishedOrdersCount = await this.prisma.order.count({
      where: {
        deliveryId: order.deliveryId,
        NOT: {
          status: {
            in: [OrderStatus.ENTREGUE, OrderStatus.NAO_ENTREGUE],
          },
        },
      },
    });

    let deliveryCompleted = false;
    if (unfinishedOrdersCount === 0 && order.deliveryId) {
      const deliveryToFinalize = await this.prisma.delivery.update({
        where: { id: order.deliveryId },
        data: { status: DeliveryStatus.FINALIZADO, dataFim: new Date() },
      });
      deliveryCompleted = true;

      // ---- CORREÇÃO APLICADA AQUI ----
      // Monta o DTO completo para criar o pagamento.
      try {
        const paymentDto = {
          amount: deliveryToFinalize.valorFrete,
          status: PaymentStatus.PENDENTE,
          tenantId: deliveryToFinalize.tenantId,
          motoristaId: deliveryToFinalize.driverId,
          deliveryId: deliveryToFinalize.id,
        };

        // Chama o serviço de pagamento com o DTO correto.
        await this.paymentsService.create(paymentDto, userId);
      } catch (error) {
        console.error(
          `Falha ao criar pagamento automático para a entrega ${order.deliveryId}:`,
          error,
        );
      }
    }

    await this.auditProvider.logAction({
      userId,
      tenantId: driver.tenantId,
      action: 'UPDATE_ORDER_STATUS',
      target: { entity: 'Order', entityId: orderId },
      details: { newStatus, oldStatus: order.status },
      timestamp: new Date(),
    });

    const adminUsers = await this.getAdminUsers(driver.tenantId);
    const notifications = [];

    if (deliveryCompleted) {
      notifications.push(
        ...adminUsers.map(
          (adminUserId) => () =>
            this.notificationProvider.send({
              recipient: { userId: adminUserId },
              channels: ['push', 'email'],
              templateId: 'delivery-completed',
              data: {
                deliveryId: order.deliveryId,
                driverName: order.delivery.driver.name,
                tenantId: driver.tenantId,
              },
            }),
        ),
      );
    }

    notifications.push(
      ...adminUsers.map(
        (adminUserId) => () =>
          this.notificationProvider.send({
            recipient: { userId: adminUserId },
            channels: ['push', 'email'],
            templateId: 'order-status-changed',
            data: {
              orderId,
              newStatus,
              oldStatus: order.status,
              deliveryId: order.deliveryId,
              customerName: order.cliente,
              driverName: order.delivery.driver.name,
              tenantId: driver.tenantId,
              orderNumber: order.numero,
            },
          }),
      ),
    );

    await this.sendNotificationsAsync(notifications);

    return updatedOrder;
  }

  async update(
    id: string,
    updateDeliveryDto: UpdateDeliveryDto,
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId },
      include: { orders: true },
    });
    if (!delivery) throw new NotFoundException(`Roteiro ${id} não encontrado.`);

    const nonEditableStatuses: DeliveryStatus[] = [
      DeliveryStatus.FINALIZADO,
      DeliveryStatus.REJEITADO,
    ];
    if (nonEditableStatuses.includes(delivery.status)) {
      throw new BadRequestException(
        `Roteiro com status '${delivery.status}' não pode ser modificado.`,
      );
    }

    const {
      driverId,
      vehicleId,
      orders: orderRefs,
      observacao,
    } = updateDeliveryDto;
    const updateData: Prisma.DeliveryUpdateInput = { observacao };

    if (driverId) {
      updateData.driver = { connect: { id: driverId } };
    }

    const finalVehicleId = vehicleId || delivery.vehicleId;
    const finalVehicle = await this.prisma.vehicle.findUnique({
      where: { id: finalVehicleId },
    });
    if (!finalVehicle) throw new NotFoundException('Veículo não encontrado.');
    if (vehicleId) {
      updateData.vehicle = { connect: { id: finalVehicleId } };
    }

    let finalOrders = delivery.orders;
    if (orderRefs) {
      await this.prisma.$transaction(async (tx) => {
        const currentOrderIds = delivery.orders.map((o) => o.id);
        const newOrderIds = orderRefs.map((o) => o.id);
        const idsToAdd = newOrderIds.filter(
          (id) => !currentOrderIds.includes(id),
        );
        const idsToRemove = currentOrderIds.filter(
          (id) => !newOrderIds.includes(id),
        );

        await tx.order.updateMany({
          where: { id: { in: idsToRemove } },
          data: {
            deliveryId: null,
            status: OrderStatus.SEM_ROTA,
            sorting: null,
          },
        });
        await tx.order.updateMany({
          where: { id: { in: idsToAdd } },
          data: {
            deliveryId: id,
            status:
              delivery.status === DeliveryStatus.A_LIBERAR
                ? OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO
                : OrderStatus.EM_ROTA,
          },
        });
        for (const orderRef of orderRefs) {
          await tx.order.update({
            where: { id: orderRef.id },
            data: { sorting: orderRef.sorting },
          });
        }
      });
      finalOrders = await this.prisma.order.findMany({
        where: { deliveryId: id },
      });
    }

    updateData.totalPeso = finalOrders.reduce(
      (sum, order) => sum + order.peso,
      0,
    );
    updateData.totalValor = finalOrders.reduce(
      (sum, order) => sum + order.valor,
      0,
    );
    updateData.valorFrete = await this.freightCalculator.calculate({
      orders: finalOrders,
      vehicle: finalVehicle,
      tenantId,
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const validationResult = await this.rulesValidator.validate({
      tenant,
      totalValor: updateData.totalValor,
      totalPeso: updateData.totalPeso,
      ordersCount: finalOrders.length,
      valorFrete: updateData.valorFrete,
    });

    if (
      delivery.status === DeliveryStatus.INICIADO &&
      validationResult.needsApproval
    ) {
      updateData.status = DeliveryStatus.A_LIBERAR;
      await this.prisma.order.updateMany({
        where: { deliveryId: id },
        data: { status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO },
      });

      const adminUsers = await this.getAdminUsers(tenantId);
      const notifications = adminUsers.map(
        (adminUserId) => () =>
          this.notificationProvider.send({
            recipient: { userId: adminUserId },
            channels: ['push', 'email'],
            templateId: 'delivery-needs-reapproval',
            data: {
              deliveryId: id,
              reasons: validationResult.reasons,
              tenantId,
            },
          }),
      );
      await this.sendNotificationsAsync(notifications);
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id },
      data: updateData,
      include: { orders: { orderBy: { sorting: 'asc' } } },
    });

    await this.auditProvider.logAction({
      userId,
      tenantId,
      action: 'UPDATE_DELIVERY',
      target: { entity: 'Delivery', entityId: id },
      details: updateDeliveryDto,
      timestamp: new Date(),
    });

    return {
      message: 'Roteiro atualizado com sucesso.',
      delivery: updatedDelivery,
    };
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId },
      include: { orders: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Roteiro com ID ${id} não encontrado.`);
    }
    if (
      delivery.status === DeliveryStatus.INICIADO &&
      delivery.orders.some((o) => o.status === OrderStatus.EM_ENTREGA)
    ) {
      throw new BadRequestException(
        `Não é possível excluir um roteiro com pedidos em entrega.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { deliveryId: id },
        data: { status: OrderStatus.SEM_ROTA, deliveryId: null, sorting: null },
      });
      await tx.paymentDelivery.deleteMany({ where: { deliveryId: id } });
      await tx.approval.deleteMany({ where: { deliveryId: id } });
      await tx.delivery.delete({ where: { id } });
    });

    await this.auditProvider.logAction({
      userId,
      tenantId,
      action: 'DELETE_DELIVERY',
      target: { entity: 'Delivery', entityId: id },
      timestamp: new Date(),
    });

    return { message: 'Roteiro removido com sucesso.' };
  }

  async removeOrderFromDelivery(
    deliveryId: string,
    orderId: string,
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
      include: { orders: true, vehicle: true, tenant: true },
    });
    if (!delivery)
      throw new NotFoundException(`Roteiro ${deliveryId} não encontrado.`);
    const order = delivery.orders.find((o) => o.id === orderId);
    if (!order)
      throw new NotFoundException(
        `Pedido ${orderId} não encontrado neste roteiro.`,
      );

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SEM_ROTA, deliveryId: null, sorting: null },
    });

    const remainingOrders = delivery.orders.filter((o) => o.id !== orderId);
    const totalPeso = remainingOrders.reduce((sum, o) => sum + o.peso, 0);
    const totalValor = remainingOrders.reduce((sum, o) => sum + o.valor, 0);
    const valorFrete = await this.freightCalculator.calculate({
      orders: remainingOrders,
      vehicle: delivery.vehicle,
      tenantId,
    });

    const updateData: Prisma.DeliveryUpdateInput = {
      totalPeso,
      totalValor,
      valorFrete,
    };
    const validationResult = await this.rulesValidator.validate({
      tenant: delivery.tenant,
      totalValor,
      totalPeso,
      ordersCount: remainingOrders.length,
      valorFrete,
    });
    if (
      delivery.status === DeliveryStatus.INICIADO &&
      validationResult.needsApproval
    ) {
      updateData.status = DeliveryStatus.A_LIBERAR;
      await this.prisma.order.updateMany({
        where: { deliveryId },
        data: { status: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO },
      });

      const adminUsers = await this.getAdminUsers(tenantId);
      const notifications = adminUsers.map(
        (adminUserId) => () =>
          this.notificationProvider.send({
            recipient: { userId: adminUserId },
            channels: ['push', 'email'],
            templateId: 'delivery-needs-reapproval-order-removed',
            data: {
              deliveryId,
              orderId,
              tenantId,
              orderNumber: order.numero,
            },
          }),
      );
      await this.sendNotificationsAsync(notifications);
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
    });

    await this.auditProvider.logAction({
      userId,
      tenantId,
      action: 'REMOVE_ORDER_FROM_DELIVERY',
      target: { entity: 'Delivery', entityId: deliveryId },
      details: { removedOrderId: orderId },
      timestamp: new Date(),
    });

    const updatedDelivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { orders: { orderBy: { sorting: 'asc' } } },
    });
    return {
      message: `Pedido ${order.numero} removido do roteiro.`,
      delivery: updatedDelivery,
    };
  }
}
