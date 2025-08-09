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
// CORREÇÃO: Importar Enums e tipos do Prisma Client
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

    // CORREÇÃO: Renomeado para driverId
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
          // CORREÇÃO: Renomeado para driverId
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
        // CORREÇÃO: camelCase
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
            // CORREÇÃO: camelCase
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

  async groupPayments(paymentIds: string[], userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    if (!paymentIds || paymentIds.length < 2) {
      throw new BadRequestException(
        'Selecione ao menos dois pagamentos para agrupar.',
      );
    }

    const payments = await this.prisma.accountsPayable.findMany({
      where: { id: { in: paymentIds }, tenantId },
    });

    if (payments.length !== paymentIds.length) {
      throw new NotFoundException(
        'Um ou mais pagamentos não foram encontrados.',
      );
    }

    // CORREÇÃO: Renomeado para driverId
    const firstDriverId = payments[0].driverId;
    if (!payments.every((p) => p.driverId === firstDriverId)) {
      throw new BadRequestException(
        'Todos os pagamentos devem pertencer ao mesmo motorista.',
      );
    }
    if (
      !payments.every((p) => p.status === PaymentStatus.PENDENTE && !p.isGroup)
    ) {
      throw new BadRequestException(
        'Apenas pagamentos individuais e "Pendentes" podem ser agrupados.',
      );
    }

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const groupedPayment = await tx.accountsPayable.create({
          data: {
            amount: totalAmount,
            // CORREÇÃO: Renomeado para driverId
            driverId: firstDriverId,
            tenantId,
            status: PaymentStatus.PENDENTE,
            isGroup: true,
          },
        });

        await tx.accountsPayable.updateMany({
          where: { id: { in: paymentIds } },
          data: {
            status: PaymentStatus.BAIXADO,
            groupedPaymentId: groupedPayment.id,
          },
        });

        return groupedPayment;
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao agrupar os pagamentos.',
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

  async ungroupPayments(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const groupedPayment = await this.prisma.accountsPayable.findFirst({
      where: { id, tenantId, isGroup: true },
    });

    if (!groupedPayment) {
      throw new NotFoundException('Pagamento agrupado não encontrado.');
    }
    if (groupedPayment.status === PaymentStatus.BAIXADO) {
      throw new BadRequestException(
        'Não é possível desagrupar um pagamento que já foi baixado.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.accountsPayable.updateMany({
          where: { groupedPaymentId: id },
          data: { status: PaymentStatus.PENDENTE, groupedPaymentId: null },
        });
        await tx.accountsPayable.delete({ where: { id } });
        return { message: 'Pagamento desagrupado com sucesso.' };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao desagrupar pagamentos.',
      );
    }
  }
}
