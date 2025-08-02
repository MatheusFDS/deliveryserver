import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse, isValid } from 'date-fns';
import {
  OrderHistoryEventDto,
  OrderHistoryEventType,
} from './dto/order-history-event.dto';
import {
  OrderStatus,
  DeliveryStatus,
  ApprovalAction,
} from '../types/status.enum';

@Injectable()
export class OrdersService {
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

  bulkDelete() {
    throw new Error('Method not implemented.');
  }

  remove() {
    throw new Error('Method not implemented.');
  }

  update() {
    throw new Error('Method not implemented.');
  }

  convertToISODate(dateString: string): string {
    let parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());

    if (!isValid(parsedDate)) {
      parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
    }

    if (!isValid(parsedDate)) {
      parsedDate = new Date(dateString);
    }

    if (!isValid(parsedDate)) {
      throw new BadRequestException(
        `Formato de data inválido: ${dateString}. Esperado dd/MM/yyyy, yyyy-MM-dd, ou formato ISO completo.`,
      );
    }
    return parsedDate.toISOString();
  }

  async upload(orders: any[], userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const createdOrders = [];
    const errors = [];

    for (const order of orders) {
      try {
        let parsedDate: string | null = null;
        if (order.data) {
          try {
            parsedDate = this.convertToISODate(order.data);
          } catch (error) {
            throw new BadRequestException(
              `Formato de data inválido para o pedido ${order.numero}: '${order.data}'. Detalhe: ${error.message}`,
            );
          }
        } else {
          throw new BadRequestException(
            `Data é obrigatória para o pedido ${order.numero || 'sem número'}.`,
          );
        }

        if (!order.numero) {
          throw new BadRequestException(
            `Número do pedido (campo 'numero') é obrigatório.`,
          );
        }
        const existingOrder = await this.prisma.order.findFirst({
          where: {
            numero: order.numero.toString(),
            tenantId: tenantId,
          },
        });

        if (existingOrder) {
          throw new BadRequestException(
            `Pedido com número ${order.numero} já existe para o tenant ${tenantId}.`,
          );
        }

        const createdOrder = await this.prisma.order.create({
          data: {
            numero: order.numero.toString(),
            data: parsedDate,
            idCliente: order.idCliente?.toString() || 'N/A',
            cliente: order.cliente || 'N/A',
            endereco: order.endereco || 'N/A',
            cidade: order.cidade || 'N/A',
            uf: order.uf || 'N/A',
            peso:
              typeof order.peso === 'string'
                ? parseFloat(order.peso.replace(',', '.'))
                : order.peso || 0,
            volume:
              typeof order.volume === 'string'
                ? parseInt(order.volume, 10)
                : order.volume || 0,
            prazo: order.prazo?.toString() || '',
            prioridade: order.prioridade?.toString() || 'Normal',
            telefone: order.telefone?.toString() || '',
            email: order.email?.toString() || '',
            bairro: order.bairro || 'N/A',
            valor:
              typeof order.valor === 'string'
                ? parseFloat(order.valor.replace(',', '.'))
                : order.valor || 0,
            instrucoesEntrega: order.instrucoesEntrega || '',
            nomeContato: order.nomeContato?.toString() || '',
            cpfCnpj: order.cpfCnpj?.toString() || 'N/A',
            cep: order.cep?.toString() || 'N/A',
            status: OrderStatus.SEM_ROTA,
            tenantId: tenantId,
            sorting:
              order.sorting !== undefined && order.sorting !== null
                ? parseInt(order.sorting, 10)
                : null,
          },
        });
        createdOrders.push(createdOrder);
      } catch (error) {
        errors.push({
          orderNumber: order.numero || 'sem número definido',
          error: error.message,
        });
      }
    }

    if (errors.length > 0 && createdOrders.length === 0) {
      throw new BadRequestException({
        message: 'Nenhum pedido foi carregado devido a erros.',
        errors,
      });
    }
    if (errors.length > 0) {
      return {
        message: 'Alguns pedidos foram criados, mas outros continham erros.',
        createdOrders,
        errors,
      };
    }

    return createdOrders;
  }

  async findAllByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.order.findMany({
      where: { tenantId },
      include: {
        Delivery: {
          include: {
            Driver: true,
            Vehicle: true,
            approvals: {
              include: { User: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        Driver: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        Delivery: {
          include: {
            Driver: true,
            Vehicle: true,
            approvals: {
              include: { User: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        Driver: true,
        deliveryProofs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado.`);
    }
    return order;
  }

  async findOrderHistoryByIdAndUserId(
    orderId: string,
    userId: string,
  ): Promise<OrderHistoryEventDto[]> {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        Delivery: {
          include: {
            Driver: true,
            Vehicle: true,
            approvals: {
              include: { User: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        deliveryProofs: {
          include: {
            Driver: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        Driver: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido com ID ${orderId} não encontrado.`);
    }

    const historyEvents: OrderHistoryEventDto[] = [];

    historyEvents.push({
      id: `order-created-${order.id}`,
      timestamp: order.createdAt.toISOString(),
      eventType: OrderHistoryEventType.PEDIDO_CRIADO,
      description: `Pedido ${order.numero} criado no sistema. Status inicial: ${OrderStatus.SEM_ROTA}.`,
      user: 'Sistema',
      details: {
        orderNumber: order.numero,
        newStatus: OrderStatus.SEM_ROTA,
      },
    });

    if (order.Delivery) {
      const delivery = order.Delivery;

      let associationTimestamp = order.updatedAt.toISOString();
      if (
        order.createdAt.getTime() === order.updatedAt.getTime() &&
        delivery.createdAt.getTime() >= order.createdAt.getTime()
      ) {
        associationTimestamp = delivery.createdAt.toISOString();
      }

      const initialAssociationEventType =
        delivery.status === DeliveryStatus.A_LIBERAR
          ? OrderHistoryEventType.ROTEIRO_ASSOCIADO_AGUARDANDO_LIBERACAO
          : OrderHistoryEventType.ROTEIRO_ASSOCIADO;
      const initialAssociationDescription =
        delivery.status === DeliveryStatus.A_LIBERAR
          ? `Pedido ${order.numero} associado ao roteiro ${delivery.id} (Roteiro: ${DeliveryStatus.A_LIBERAR}). Status do pedido: ${OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO}.`
          : `Pedido ${order.numero} associado ao roteiro ${delivery.id} (Roteiro: ${delivery.status}). Status do pedido: ${OrderStatus.EM_ROTA}.`;

      historyEvents.push({
        id: `delivery-associated-${delivery.id}-${order.id}`,
        timestamp: associationTimestamp,
        eventType: initialAssociationEventType,
        description: initialAssociationDescription,
        user: 'Sistema',
        details: {
          orderNumber: order.numero,
          deliveryId: delivery.id,
          driverName: delivery.Driver?.name,
          vehiclePlate: delivery.Vehicle?.plate,
          deliveryStatus: delivery.status,
          newStatus:
            delivery.status === DeliveryStatus.A_LIBERAR
              ? OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO
              : OrderStatus.EM_ROTA,
        },
      });

      delivery.approvals.forEach((approval) => {
        let eventTypeForOrderContext: OrderHistoryEventType;
        let descriptionForOrderContext = '';
        let orderStatusAfterApprovalEvent = order.status;

        if (approval.action.toUpperCase() === ApprovalAction.APPROVED) {
          eventTypeForOrderContext =
            OrderHistoryEventType.ROTEIRO_LIBERADO_PARA_PEDIDO;
          descriptionForOrderContext = `Roteiro ${delivery.id} (que inclui o pedido ${order.numero}) foi liberado.`;
          if (order.status === OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO) {
            orderStatusAfterApprovalEvent = OrderStatus.EM_ROTA;
          }
        } else if (approval.action.toUpperCase() === ApprovalAction.REJECTED) {
          eventTypeForOrderContext =
            OrderHistoryEventType.ROTEIRO_REJEITADO_PARA_PEDIDO;
          descriptionForOrderContext = `Roteiro ${delivery.id} (que inclui o pedido ${order.numero}) foi rejeitado. Motivo: ${approval.motivo || 'Não especificado'}.`;
          if (order.status === OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO) {
            orderStatusAfterApprovalEvent = OrderStatus.SEM_ROTA;
          }
        } else if (approval.action.toUpperCase() === 'RE_APPROVAL_NEEDED') {
          // A linha abaixo foi corrigida para usar o novo membro do enum
          eventTypeForOrderContext =
            OrderHistoryEventType.ROTEIRO_REQUER_NOVA_LIBERACAO_PARA_PEDIDO;
          descriptionForOrderContext = `Alterações no roteiro ${delivery.id} (que inclui o pedido ${order.numero}) exigem nova liberação. Motivo: ${approval.motivo || 'Não especificado'}.`;
          if (order.status === OrderStatus.EM_ROTA) {
            orderStatusAfterApprovalEvent =
              OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO;
          }
        }

        if (eventTypeForOrderContext) {
          historyEvents.push({
            id: approval.id,
            timestamp: approval.createdAt.toISOString(),
            eventType: eventTypeForOrderContext,
            description: descriptionForOrderContext,
            user: approval.User?.name || 'Usuário Desconhecido',
            details: {
              orderNumber: order.numero,
              deliveryId: delivery.id,
              deliveryStatus:
                approval.action.toUpperCase() === ApprovalAction.APPROVED
                  ? DeliveryStatus.INICIADO
                  : approval.action.toUpperCase() === ApprovalAction.REJECTED
                    ? DeliveryStatus.REJEITADO
                    : approval.action.toUpperCase() === 'RE_APPROVAL_NEEDED'
                      ? DeliveryStatus.A_LIBERAR
                      : delivery.status,
              approvalAction: approval.action,
              approvalReason: approval.motivo,
              newStatus: orderStatusAfterApprovalEvent,
            },
          });
        }
      });

      if (delivery.status === DeliveryStatus.FINALIZADO && delivery.dataFim) {
        historyEvents.push({
          id: `delivery-finalizado-${delivery.id}-for-order-${order.id}`,
          timestamp: delivery.dataFim.toISOString(),
          eventType: OrderHistoryEventType.ROTEIRO_FINALIZADO,
          description: `Roteiro ${delivery.id} que incluía o pedido ${order.numero} foi finalizado.`,
          user: delivery.Driver?.name || 'Sistema',
          details: {
            orderNumber: order.numero,
            deliveryId: delivery.id,
            deliveryStatus: DeliveryStatus.FINALIZADO,
          },
        });
      }
    }

    if (order.startedAt) {
      historyEvents.push({
        id: `order-delivery-started-${order.id}`,
        timestamp: order.startedAt.toISOString(),
        eventType: OrderHistoryEventType.ENTREGA_INICIADA,
        description: `Entrega do pedido ${order.numero} iniciada.`,
        user:
          order.Driver?.name || order.Delivery?.Driver?.name || 'Motorista App',
        details: {
          orderNumber: order.numero,
          newStatus: OrderStatus.EM_ENTREGA,
          driverName: order.Driver?.name || order.Delivery?.Driver?.name,
        },
      });
    }

    if (order.completedAt) {
      if (order.status === OrderStatus.ENTREGUE) {
        historyEvents.push({
          id: `order-delivered-${order.id}`,
          timestamp: order.completedAt.toISOString(),
          eventType: OrderHistoryEventType.PEDIDO_ENTREGUE,
          description: `Pedido ${order.numero} entregue com sucesso.`,
          user:
            order.Driver?.name ||
            order.Delivery?.Driver?.name ||
            'Motorista App',
          details: {
            orderNumber: order.numero,
            finalStatus: order.status,
            driverName: order.Driver?.name || order.Delivery?.Driver?.name,
          },
        });
      } else if (order.status === OrderStatus.NAO_ENTREGUE) {
        historyEvents.push({
          id: `order-not-delivered-${order.id}`,
          timestamp: order.completedAt.toISOString(),
          eventType: OrderHistoryEventType.PEDIDO_NAO_ENTREGUE,
          description: `Tentativa de entrega do pedido ${order.numero} falhou. Motivo: ${order.motivoNaoEntrega || 'Não especificado'}.`,
          user:
            order.Driver?.name ||
            order.Delivery?.Driver?.name ||
            'Motorista App',
          details: {
            orderNumber: order.numero,
            finalStatus: order.status,
            motivoNaoEntrega: order.motivoNaoEntrega,
            codigoMotivoNaoEntrega: order.codigoMotivoNaoEntrega,
            driverName: order.Driver?.name || order.Delivery?.Driver?.name,
          },
        });
      }
    }

    order.deliveryProofs.forEach((proof) => {
      historyEvents.push({
        id: proof.id,
        timestamp: proof.createdAt.toISOString(),
        eventType: OrderHistoryEventType.COMPROVANTE_ANEXADO,
        description: `Comprovante de entrega anexado para o pedido ${order.numero}.`,
        user: proof.Driver?.name || 'Motorista App',
        details: {
          orderNumber: order.numero,
          proofUrl: proof.proofUrl,
          driverName: proof.Driver?.name,
        },
      });
    });

    historyEvents.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const lastSpecificEvent =
      historyEvents.length > 0 ? historyEvents[historyEvents.length - 1] : null;
    if (
      lastSpecificEvent &&
      order.updatedAt.toISOString() > lastSpecificEvent.timestamp &&
      order.status !== lastSpecificEvent.details?.newStatus &&
      order.status !== lastSpecificEvent.details?.finalStatus
    ) {
      const isCoveredByTimestampFields =
        (order.status === OrderStatus.EM_ENTREGA &&
          order.startedAt?.toISOString() === order.updatedAt.toISOString()) ||
        ((order.status === OrderStatus.ENTREGUE ||
          order.status === OrderStatus.NAO_ENTREGUE) &&
          order.completedAt?.toISOString() === order.updatedAt.toISOString());

      if (!isCoveredByTimestampFields) {
        historyEvents.push({
          id: `order-status-updated-${order.id}-${order.updatedAt.toISOString()}`,
          timestamp: order.updatedAt.toISOString(),
          eventType: OrderHistoryEventType.STATUS_PEDIDO_ATUALIZADO,
          description: `Status do pedido ${order.numero} atualizado para: ${order.status}.`,
          user: 'Sistema/App',
          details: {
            orderNumber: order.numero,
            newStatus: order.status,
            oldStatus:
              lastSpecificEvent.details?.newStatus ||
              lastSpecificEvent.details?.finalStatus,
          },
        });
        historyEvents.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
      }
    }

    return historyEvents;
  }
}
