import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse, isValid, endOfDay, startOfDay } from 'date-fns';
import {
  OrderHistoryEventDto,
  OrderHistoryEventType,
} from './dto/order-history-event.dto';
import { OrderStatus } from '../types/status.enum';
import { Prisma } from '@prisma/client';

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

  private convertToISODate(dateString: string): string {
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

    return {
      message: 'Todos os pedidos foram importados com sucesso.',
      createdOrders,
    };
  }

  async findAllByUserId(
    userId: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.OrderWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { cliente: { contains: search, mode: 'insensitive' } },
        { cidade: { contains: search, mode: 'insensitive' } },
        { endereco: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate && endDate) {
      try {
        where.data = {
          gte: startOfDay(new Date(this.convertToISODate(startDate))),
          lte: endOfDay(new Date(this.convertToISODate(endDate))),
        };
      } catch (e) {
        throw new BadRequestException(
          'Formato de data inválido para o período informado.',
        );
      }
    }

    try {
      const [orders, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          skip,
          take,
          include: {
            Delivery: { select: { id: true, status: true } },
            Driver: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.order.count({ where }),
      ]);

      return {
        data: orders,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar os pedidos.',
      );
    }
  }

  async findAllByTenantList(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.order.findMany({
      where: { tenantId },
      include: {
        Delivery: { select: { id: true, status: true } },
        Driver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
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
        deliveryProofs: {
          include: { Driver: true },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
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
      description: `Pedido ${order.numero} criado no sistema.`,
      user: 'Sistema',
    });

    order.history.forEach((historyEntry) => {
      historyEvents.push({
        id: historyEntry.id,
        timestamp: historyEntry.createdAt.toISOString(),
        eventType: OrderHistoryEventType.STATUS_PEDIDO_ATUALIZADO,
        description: historyEntry.description,
        user: historyEntry.user?.name || 'Sistema',
        details: {
          newStatus: historyEntry.status,
        },
      });
    });

    order.deliveryProofs.forEach((proof) => {
      historyEvents.push({
        id: proof.id,
        timestamp: proof.createdAt.toISOString(),
        eventType: OrderHistoryEventType.COMPROVANTE_ANEXADO,
        description: `Comprovante de entrega anexado.`,
        user: proof.Driver?.name || 'Motorista App',
        details: {
          proofUrl: proof.proofUrl,
        },
      });
    });

    historyEvents.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return historyEvents;
  }
}
