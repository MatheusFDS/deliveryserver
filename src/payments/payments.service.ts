import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Prisma, PaymentStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class PaymentsService {
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

  async create(createPaymentDto: CreatePaymentDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const { deliveryId } = createPaymentDto;

    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) {
      throw new NotFoundException(
        'Entrega não encontrada ou não pertence à sua empresa.',
      );
    }

    const driverId = delivery.driverId;

    const existingPaymentLink = await this.prisma.paymentDelivery.findFirst({
      where: { deliveryId },
    });
    if (existingPaymentLink) {
      throw new ConflictException(
        `A entrega com ID ${deliveryId} já possui um pagamento associado.`,
      );
    }

    try {
      return await this.prisma.accountsPayable.create({
        data: {
          amount: delivery.valorFrete,
          driverId: driverId,
          tenantId,
          status: PaymentStatus.PENDENTE,
          isGroup: false,
          paymentDeliveries: {
            create: {
              deliveryId: deliveryId,
              tenantId: tenantId,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao criar o pagamento.',
      );
    }
  }

  async findAllByUserId(
    userId: string,
    search?: string,
    status?: PaymentStatus,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.AccountsPayableWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { driver: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      try {
        where.createdAt = {
          gte: startOfDay(new Date(startDate)),
          lte: endOfDay(new Date(endDate)),
        };
      } catch (e) {
        throw new BadRequestException('Formato de data inválido.');
      }
    }

    try {
      const [payments, total] = await this.prisma.$transaction([
        this.prisma.accountsPayable.findMany({
          where,
          skip,
          take,
          include: {
            driver: { select: { name: true } },
            paymentDeliveries: {
              include: { delivery: { select: { id: true } } },
            },
            groupedPayments: {
              select: {
                paymentDeliveries: {
                  include: { delivery: { select: { id: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.accountsPayable.count({ where }),
      ]);
      return {
        data: payments,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar pagamentos.',
      );
    }
  }

  async markAsPaid(paymentIds: string[], userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    if (!paymentIds || paymentIds.length === 0) {
      throw new BadRequestException(
        'É necessário fornecer ao menos um ID de pagamento.',
      );
    }

    const paymentsToUpdate = await this.prisma.accountsPayable.findMany({
      where: {
        id: { in: paymentIds },
        tenantId,
      },
    });

    if (paymentsToUpdate.length !== paymentIds.length) {
      throw new NotFoundException(
        'Um ou mais pagamentos não foram encontrados ou não pertencem à sua empresa.',
      );
    }

    const nonPendingPayments = paymentsToUpdate.filter(
      (p) => p.status !== PaymentStatus.PENDENTE,
    );

    if (nonPendingPayments.length > 0) {
      throw new BadRequestException(
        `Apenas pagamentos com status 'PENDENTE' podem ser marcados como pagos.`,
      );
    }

    try {
      const result = await this.prisma.accountsPayable.updateMany({
        where: {
          id: { in: paymentIds },
          tenantId,
        },
        data: {
          status: PaymentStatus.PAGO,
        },
      });

      return {
        message: `${result.count} pagamento(s) marcado(s) como 'Pago'.`,
        count: result.count,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao marcar pagamentos como pagos.',
      );
    }
  }

  async updateStatus(id: string, status: PaymentStatus, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const payment = await this.prisma.accountsPayable.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (payment.status === status) {
      return payment;
    }

    try {
      return await this.prisma.accountsPayable.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar o status do pagamento.',
      );
    }
  }

  async revertPaymentToPending(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const payment = await this.prisma.accountsPayable.findFirst({
      where: { id, tenantId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (payment.status !== PaymentStatus.PAGO) {
      throw new BadRequestException(
        `Apenas pagamentos com status 'PAGO' podem ser revertidos.`,
      );
    }

    try {
      return await this.prisma.accountsPayable.update({
        where: { id },
        data: { status: PaymentStatus.PENDENTE },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao reverter o status do pagamento.',
      );
    }
  }
}
