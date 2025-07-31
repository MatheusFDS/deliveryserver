import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

export enum PaymentStatus {
  PENDENTE = 'Pendente',
  PAGO = 'Pago',
  BAIXADO = 'Baixado',
  CANCELADO = 'Cancelado',
}

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

  findByDriver(): any {
    throw new Error('Method not implemented.');
  }

  async create(createPaymentDto: CreatePaymentDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const { amount, status, motoristaId, deliveryId } = createPaymentDto;

    const driver = await this.prisma.driver.findFirst({
      where: { id: motoristaId, tenantId },
    });
    if (!driver) {
      throw new BadRequestException(
        'Motorista inválido ou não pertence ao seu tenant.',
      );
    }

    if (deliveryId) {
      const delivery = await this.prisma.delivery.findFirst({
        where: { id: deliveryId, tenantId },
      });
      if (!delivery) {
        throw new BadRequestException(
          'Roteiro inválido ou não pertence ao seu tenant.',
        );
      }
    }

    const paymentData: any = {
      amount,
      status: status || PaymentStatus.PENDENTE,
      tenantId,
      motoristaId,
      isGroup: false,
    };

    if (deliveryId) {
      paymentData.paymentDeliveries = {
        create: {
          deliveryId,
          tenantId,
        },
      };
    }

    return this.prisma.accountsPayable.create({
      data: paymentData,
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: true,
          },
        },
      },
    });
  }

  async findAllByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.accountsPayable.findMany({
      where: { tenantId },
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const payment = await this.prisma.accountsPayable.findUnique({
      where: { id, tenantId },
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'Pagamento não encontrado ou não pertence ao seu tenant.',
      );
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const payment = await this.prisma.accountsPayable.findUnique({
      where: { id, tenantId },
    });

    if (!payment) {
      throw new NotFoundException(
        'Pagamento não encontrado ou não pertence ao seu tenant.',
      );
    }

    if (payment.groupedPaymentId) {
      throw new BadRequestException(
        'Não é possível atualizar um pagamento que faz parte de um agrupamento.',
      );
    }

    if (
      payment.status === PaymentStatus.BAIXADO &&
      updatePaymentDto.status !== PaymentStatus.PENDENTE
    ) {
      throw new BadRequestException(
        `Não é possível atualizar um pagamento baixado para outro status além de "${PaymentStatus.PENDENTE}".`,
      );
    }

    if (updatePaymentDto.motoristaId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: updatePaymentDto.motoristaId, tenantId },
      });
      if (!driver) {
        throw new BadRequestException(
          'Novo motorista inválido ou não pertence ao seu tenant.',
        );
      }
    }

    if (updatePaymentDto.deliveryId) {
      const delivery = await this.prisma.delivery.findFirst({
        where: { id: updatePaymentDto.deliveryId, tenantId },
      });
      if (!delivery) {
        throw new BadRequestException(
          'Novo roteiro inválido ou não pertence ao seu tenant.',
        );
      }
    }

    // CORREÇÃO: Passa updatePaymentDto diretamente para data
    return this.prisma.accountsPayable.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const payment = await this.prisma.accountsPayable.findUnique({
      where: { id, tenantId },
    });

    if (!payment) {
      throw new NotFoundException(
        'Pagamento não encontrado ou não pertence ao seu tenant.',
      );
    }

    if (
      payment.status === PaymentStatus.BAIXADO ||
      payment.isGroup ||
      payment.groupedPaymentId
    ) {
      throw new BadRequestException(
        'Não é possível excluir um pagamento baixado, agrupado ou parte de um agrupamento.',
      );
    }

    return this.prisma.accountsPayable.delete({
      where: { id },
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });
  }

  async groupPayments(paymentIds: string[], userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const payments = await this.prisma.accountsPayable.findMany({
      where: {
        id: { in: paymentIds },
        tenantId,
        isGroup: false,
        groupedPaymentId: null,
      },
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });

    if (payments.length === 0) {
      throw new BadRequestException(
        'Nenhum pagamento elegível encontrado para os IDs fornecidos.',
      );
    }

    const motoristaId = payments[0].motoristaId;
    if (!payments.every((payment) => payment.motoristaId === motoristaId)) {
      throw new BadRequestException(
        'Todos os pagamentos devem ser do mesmo motorista para serem agrupados.',
      );
    }

    if (payments.some((payment) => payment.status === PaymentStatus.BAIXADO)) {
      throw new BadRequestException(
        'Não é possível agrupar pagamentos que já foram baixados.',
      );
    }

    const totalAmount = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const deliveryIds = payments.flatMap((payment) =>
      payment.paymentDeliveries.map((pd) => pd.delivery.id),
    );

    const groupedPayment = await this.prisma.accountsPayable.create({
      data: {
        amount: totalAmount,
        status: PaymentStatus.PENDENTE,
        tenantId,
        motoristaId,
        isGroup: true,
        paymentDeliveries: {
          create: deliveryIds.map((deliveryId) => ({ deliveryId, tenantId })),
        },
      },
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });

    await this.prisma.accountsPayable.updateMany({
      where: {
        id: { in: paymentIds },
      },
      data: {
        status: PaymentStatus.BAIXADO,
        groupedPaymentId: groupedPayment.id,
      },
    });

    return groupedPayment;
  }

  async ungroupPayments(paymentId: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const payment = await this.prisma.accountsPayable.findUnique({
      where: { id: paymentId, tenantId },
      include: {
        Driver: true,
        paymentDeliveries: {
          include: {
            delivery: {
              include: {
                orders: true,
              },
            },
          },
        },
      },
    });

    if (!payment || !payment.isGroup) {
      throw new BadRequestException(
        'Pagamento não encontrado ou não é um pagamento agrupado.',
      );
    }

    if (payment.status === PaymentStatus.BAIXADO) {
      throw new BadRequestException(
        'Não é possível desagrupar um pagamento baixado. Cancele a baixa primeiro.',
      );
    }

    await this.prisma.accountsPayable.updateMany({
      where: { groupedPaymentId: paymentId, tenantId },
      data: { status: PaymentStatus.PENDENTE, groupedPaymentId: null },
    });

    return this.prisma.accountsPayable.delete({
      where: { id: paymentId, tenantId },
    });
  }
}
