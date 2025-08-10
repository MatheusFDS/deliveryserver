import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
import { DriversService } from '../drivers/drivers.service';
// CORREÇÃO: Importar Enums diretamente do Prisma Client
import { OrderStatus, DeliveryStatus, PaymentStatus } from '@prisma/client';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MobileService {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly driversService: DriversService,
    private readonly prisma: PrismaService,
  ) {}

  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

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

  private async getDriverDetailsByUserId(
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

  async getProfile(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: {
        tenant: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
      },
    });

    if (user.role.name === 'driver' && !driver) {
      throw new NotFoundException(
        'Perfil de motorista não encontrado para o usuário com role de motorista.',
      );
    }

    const vehicle = driver
      ? await this.prisma.vehicle.findFirst({
          where: { driverId: driver.id, tenantId: tenantId },
          include: { category: true },
        })
      : null;

    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: driver?.cpf || user.email,
        vehicle: vehicle ? `${vehicle.model}` : 'Não informado',
        plate: vehicle?.plate || 'Não informado',
        companyName: user.tenant?.name || 'Empresa',
        companyCnpj: '12.345.678/0001-90',
        tenantId: user.tenantId,
        driverId: driver?.id || null,
      },
      success: true,
      message: 'Perfil carregado com sucesso',
    };
  }

  async getDriverRoutes(userId: string, includeHistory: boolean = false) {
    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const statusFilter: DeliveryStatus[] = includeHistory
      ? [
          DeliveryStatus.A_LIBERAR,
          DeliveryStatus.INICIADO,
          DeliveryStatus.FINALIZADO,
        ]
      : [DeliveryStatus.A_LIBERAR, DeliveryStatus.INICIADO];

    const deliveriesFromDb = await this.prisma.delivery.findMany({
      where: {
        driverId: driverId,
        tenantId,
        status: { in: statusFilter },
      },
      include: {
        orders: {
          orderBy: { sorting: 'asc' },
          include: {
            deliveryProofs: {
              select: {
                id: true,
                proofUrl: true,
                createdAt: true,
              },
            },
          },
        },
        driver: true,
        vehicle: true,
        paymentDeliveries: {
          include: {
            accountsPayable: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: { dataInicio: 'desc' },
    });

    const routes = deliveriesFromDb.map((delivery) => {
      let paymentStatus: 'pago' | 'nao_pago' = 'nao_pago';
      if (delivery.paymentDeliveries && delivery.paymentDeliveries.length > 0) {
        const isPaid = delivery.paymentDeliveries.some(
          (pd) => pd.accountsPayable?.status === PaymentStatus.PAGO,
        );
        if (isPaid) {
          paymentStatus = 'pago';
        }
      }

      return {
        id: delivery.id,
        date: delivery.dataInicio.toISOString().split('T')[0],
        status: this.mapRouteStatusToMobile(delivery.status),
        totalValue: delivery.totalValor,
        freightValue: delivery.valorFrete,
        paymentStatus: paymentStatus,
        observacao: delivery.observacao,
        vehicle: delivery.vehicle
          ? `${delivery.vehicle.model} (${delivery.vehicle.plate})`
          : 'Não informado',
        driverName: delivery.driver?.name || 'Não informado',
        deliveries: delivery.orders.map((order) => ({
          id: order.id,
          customerName: order.cliente,
          address: `${order.endereco}, ${order.bairro}, ${order.cidade} - ${order.uf} (${order.cep})`,
          phone: order.telefone,
          value: order.valor,
          status: this.mapOrderStatusToMobile(order.status),
          items: [`Pedido ${order.numero}`],
          paymentMethod: 'A combinar',
          notes: order.instrucoesEntrega,
          numeroPedido: order.numero,
          sorting: order.sorting,
          cpfCnpjDestinatario: order.cpfCnpj,
          nomeContato: order.nomeContato,
          emailDestinatario: order.email,
          hasProof: order.deliveryProofs.length > 0,
          proofCount: order.deliveryProofs.length,
        })),
      };
    });

    return {
      data: routes,
      success: true,
      message: `${routes.length} roteiros encontrados.`,
    };
  }

  async getDriverHistory(userId: string) {
    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const deliveriesFromDb = await this.prisma.delivery.findMany({
      where: {
        driverId: driverId,
        tenantId,
        status: DeliveryStatus.FINALIZADO,
      },
      include: {
        orders: {
          orderBy: { sorting: 'asc' },
          include: {
            deliveryProofs: {
              select: { id: true, proofUrl: true, createdAt: true },
            },
          },
        },
        driver: true,
        vehicle: true,
        paymentDeliveries: {
          include: {
            accountsPayable: { select: { status: true } },
          },
        },
      },
      orderBy: { dataFim: 'desc' },
    });

    const routes = deliveriesFromDb.map((delivery) => {
      let paymentStatus: 'pago' | 'nao_pago' = 'nao_pago';
      if (delivery.paymentDeliveries && delivery.paymentDeliveries.length > 0) {
        const isPaid = delivery.paymentDeliveries.some(
          (pd) => pd.accountsPayable?.status === PaymentStatus.PAGO,
        );
        if (isPaid) {
          paymentStatus = 'pago';
        }
      }

      return {
        id: delivery.id,
        date: (delivery.dataFim || delivery.dataInicio)
          .toISOString()
          .split('T')[0],
        status: this.mapRouteStatusToMobile(delivery.status),
        totalValue: delivery.totalValor,
        freightValue: delivery.valorFrete,
        paymentStatus: paymentStatus,
        observacao: delivery.observacao,
        vehicle: delivery.vehicle
          ? `${delivery.vehicle.model} (${delivery.vehicle.plate})`
          : 'Não informado',
        driverName: delivery.driver?.name || 'Não informado',
        deliveries: delivery.orders.map((order) => ({
          id: order.id,
          customerName: order.cliente,
          address: `${order.endereco}, ${order.bairro}, ${order.cidade} - ${order.uf} (${order.cep})`,
          phone: order.telefone,
          value: order.valor,
          status: this.mapOrderStatusToMobile(order.status),
          items: [`Pedido ${order.numero}`],
          paymentMethod: 'A combinar',
          notes: order.instrucoesEntrega,
          numeroPedido: order.numero,
          sorting: order.sorting,
          cpfCnpjDestinatario: order.cpfCnpj,
          nomeContato: order.nomeContato,
          emailDestinatario: order.email,
          hasProof: order.deliveryProofs.length > 0,
          proofCount: order.deliveryProofs.length,
        })),
      };
    });

    return {
      data: routes,
      success: true,
      message: `${routes.length} roteiros do histórico encontrados.`,
    };
  }

  async getDriverReceivables(userId: string) {
    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        driverId: driverId,
        tenantId: tenantId,
        status: DeliveryStatus.FINALIZADO,
      },
      select: {
        valorFrete: true,
        paymentDeliveries: {
          include: {
            accountsPayable: {
              select: { status: true },
            },
          },
        },
      },
    });

    let totalReceivableAmount = 0;
    deliveries.forEach((delivery) => {
      let isDeliveryPaid = false;
      if (delivery.paymentDeliveries && delivery.paymentDeliveries.length > 0) {
        isDeliveryPaid = delivery.paymentDeliveries.some(
          (pd) => pd.accountsPayable?.status === PaymentStatus.PAGO,
        );
      }
      if (!isDeliveryPaid) {
        totalReceivableAmount += delivery.valorFrete;
      }
    });

    return {
      data: {
        totalAmount: totalReceivableAmount,
      },
      success: true,
      message: 'Total a receber carregado com sucesso.',
    };
  }

  async getRouteDetails(routeId: string, userId: string) {
    if (!this.isValidUUID(routeId)) {
      throw new BadRequestException(`ID de roteiro inválido: ${routeId}`);
    }

    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id: routeId,
        tenantId: tenantId,
        driverId: driverId,
      },
      include: {
        orders: {
          orderBy: { sorting: 'asc' },
          include: {
            deliveryProofs: {
              select: { id: true, proofUrl: true, createdAt: true },
            },
          },
        },
        driver: true,
        vehicle: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(
        'Roteiro não encontrado ou não pertence a este motorista.',
      );
    }

    const route = {
      id: delivery.id,
      date: delivery.dataInicio.toISOString().split('T')[0],
      status: this.mapRouteStatusToMobile(delivery.status),
      totalValue: delivery.totalValor,
      observacao: delivery.observacao,
      vehicle: delivery.vehicle
        ? `${delivery.vehicle.model} (${delivery.vehicle.plate})`
        : 'Não informado',
      driverName: delivery.driver?.name || 'Não informado',
      deliveries: delivery.orders.map((order) => ({
        id: order.id,
        customerName: order.cliente,
        address: `${order.endereco}, ${order.bairro}, ${order.cidade} - ${order.uf} (${order.cep})`,
        phone: order.telefone,
        value: order.valor,
        status: this.mapOrderStatusToMobile(order.status),
        items: [`Pedido ${order.numero}`],
        paymentMethod: 'A combinar',
        notes: order.instrucoesEntrega,
        numeroPedido: order.numero,
        sorting: order.sorting,
        cpfCnpjDestinatario: order.cpfCnpj,
        nomeContato: order.nomeContato,
        emailDestinatario: order.email,
        hasProof: order.deliveryProofs.length > 0,
        proofCount: order.deliveryProofs.length,
      })),
    };

    return {
      data: route,
      success: true,
      message: 'Roteiro carregado com sucesso',
    };
  }

  async getDeliveryDetails(orderId: string, userId: string) {
    if (!this.isValidUUID(orderId)) {
      throw new BadRequestException(`ID de pedido inválido: ${orderId}`);
    }

    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        delivery: { driverId: driverId },
      },
      include: {
        delivery: {
          select: {
            id: true,
            status: true,
            observacao: true,
          },
        },
        deliveryProofs: {
          select: {
            id: true,
            proofUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido (entrega individual) não encontrado ou não pertence a este motorista.',
      );
    }

    const deliveryDetails = {
      id: order.id,
      customerName: order.cliente,
      address: `${order.endereco}, ${order.bairro}, ${order.cidade} - ${order.uf} (${order.cep})`,
      phone: order.telefone,
      value: order.valor,
      status: this.mapOrderStatusToMobile(order.status),
      items: [`Pedido ${order.numero}`],
      paymentMethod: 'A combinar',
      notes: order.instrucoesEntrega,
      numeroPedido: order.numero,
      cpfCnpjDestinatario: order.cpfCnpj,
      nomeContato: order.nomeContato,
      emailDestinatario: order.email,
      routeId: order.delivery?.id || null,
      routeStatus: order.delivery
        ? this.mapRouteStatusToMobile(order.delivery.status)
        : null,
      routeNotes: order.delivery?.observacao || null,
      hasProof: order.deliveryProofs.length > 0,
      proofCount: order.deliveryProofs.length,
      proofs: order.deliveryProofs,
    };

    return {
      data: deliveryDetails,
      success: true,
      message: 'Detalhes da entrega individual carregados',
    };
  }

  async updateOrderStatus(
    orderId: string,
    updateData: {
      status: string;
      motivoNaoEntrega?: string;
      codigoMotivoNaoEntrega?: string;
    },
    userId: string,
  ) {
    if (!this.isValidUUID(orderId)) {
      throw new BadRequestException(`ID de pedido inválido: ${orderId}`);
    }

    const backendStatusString = this.mapMobileToOrderStatus(updateData.status);
    if (!backendStatusString) {
      throw new BadRequestException(
        `Status (mobile) inválido fornecido: ${updateData.status}`,
      );
    }

    const typedBackendStatus = backendStatusString;

    if (
      typedBackendStatus === OrderStatus.NAO_ENTREGUE &&
      !updateData.motivoNaoEntrega
    ) {
      throw new BadRequestException(
        'O motivo da não entrega é obrigatório quando o status é "Não entregue" (retornada).',
      );
    }

    const updatedOrder = await this.deliveryService.updateOrderStatus(
      orderId,
      typedBackendStatus,
      userId,
      updateData.motivoNaoEntrega,
      updateData.codigoMotivoNaoEntrega,
    );

    return {
      data: {
        orderId: updatedOrder.id,
        newStatusBackend: updatedOrder.status,
        newStatusMobile: this.mapOrderStatusToMobile(
          updatedOrder.status as OrderStatus,
        ),
        message: 'Status do pedido atualizado com sucesso.',
      },
      success: true,
      message: 'Status do pedido atualizado com sucesso.',
    };
  }

  async uploadDeliveryProof(
    orderId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    if (!this.isValidUUID(orderId)) {
      throw new BadRequestException(`ID de pedido inválido: ${orderId}`);
    }

    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { delivery: true },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado ou não pertence ao seu tenant.',
      );
    }

    if (order.delivery && order.delivery.driverId !== driverId) {
      throw new ForbiddenException(
        'Você não tem permissão para anexar comprovantes a este pedido.',
      );
    }

    if (!file) {
      throw new BadRequestException('Arquivo de imagem é obrigatório.');
    }

    // Lembrete: Esta parte será refatorada futuramente para usar o StorageAdapter
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'proofs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExtension = path.extname(file.originalname);
      const fileName = `proof_${orderId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      const compressedImage = await sharp(file.buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      fs.writeFileSync(filePath, compressedImage);

      const proof = await this.prisma.deliveryProof.create({
        data: {
          orderId,
          driverId,
          tenantId,
          proofUrl: `/uploads/proofs/${fileName}`,
        },
      });

      return {
        data: {
          id: proof.id,
          proofUrl: proof.proofUrl,
          message: 'Comprovante enviado com sucesso!',
        },
        success: true,
        message: 'Comprovante enviado com sucesso!',
      };
    } catch (error) {
      throw new BadRequestException(
        'Erro ao processar a imagem do comprovante.',
      );
    }
  }

  async getOrderProofs(orderId: string, userId: string) {
    if (!this.isValidUUID(orderId)) {
      throw new BadRequestException(`ID de pedido inválido: ${orderId}`);
    }

    const { id: driverId, tenantId } =
      await this.getDriverDetailsByUserId(userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, delivery: { driverId: driverId } },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado ou não pertence a este motorista.',
      );
    }

    const proofs = await this.prisma.deliveryProof.findMany({
      where: { orderId, tenantId },
      include: { driver: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: proofs.map((proof) => ({
        id: proof.id,
        proofUrl: proof.proofUrl,
        driverName: proof.driver.name,
        createdAt: proof.createdAt,
      })),
      success: true,
      message: `${proofs.length} comprovantes encontrados.`,
    };
  }

  // CORREÇÃO: Mapeamentos ajustados para serem consistentes com frontend
  private mapRouteStatusToMobile(statusBackend: DeliveryStatus): string {
    const mapping: Record<DeliveryStatus, string> = {
      [DeliveryStatus.A_LIBERAR]: 'A_LIBERAR',
      [DeliveryStatus.INICIADO]: 'INICIADO',
      [DeliveryStatus.FINALIZADO]: 'FINALIZADO',
      [DeliveryStatus.REJEITADO]: 'REJEITADO',
    };
    return mapping[statusBackend] || String(statusBackend);
  }

  private mapOrderStatusToMobile(statusBackend: OrderStatus): string {
    const mapping: Record<OrderStatus, string> = {
      [OrderStatus.SEM_ROTA]: 'SEM_ROTA',
      [OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO]:
        'EM_ROTA_AGUARDANDO_LIBERACAO',
      [OrderStatus.EM_ROTA]: 'EM_ROTA',
      [OrderStatus.EM_ENTREGA]: 'EM_ENTREGA',
      [OrderStatus.ENTREGUE]: 'ENTREGUE',
      [OrderStatus.NAO_ENTREGUE]: 'NAO_ENTREGUE',
    };
    return mapping[statusBackend] || String(statusBackend);
  }

  // CORREÇÃO: Mapeamento do mobile para backend ajustado
  private mapMobileToOrderStatus(statusMobile: string): OrderStatus | null {
    const mapping: Record<string, OrderStatus> = {
      // Mapeamentos diretos (UPPER_CASE)
      EM_ROTA: OrderStatus.EM_ROTA,
      EM_ENTREGA: OrderStatus.EM_ENTREGA,
      ENTREGUE: OrderStatus.ENTREGUE,
      NAO_ENTREGUE: OrderStatus.NAO_ENTREGUE,

      // Mapeamentos alternativos para compatibilidade
      em_entrega: OrderStatus.EM_ENTREGA,
      iniciada: OrderStatus.EM_ENTREGA,
      entregue: OrderStatus.ENTREGUE,
      finalizada: OrderStatus.ENTREGUE,
      nao_entregue: OrderStatus.NAO_ENTREGUE,
      retornada: OrderStatus.NAO_ENTREGUE,
    };
    return mapping[statusMobile] || null;
  }

  private mapMobileToDeliveryStatus(
    statusMobile: string,
  ): DeliveryStatus | null {
    const mapping: Record<string, DeliveryStatus> = {
      // Mapeamentos diretos (UPPER_CASE)
      A_LIBERAR: DeliveryStatus.A_LIBERAR,
      INICIADO: DeliveryStatus.INICIADO,
      FINALIZADO: DeliveryStatus.FINALIZADO,
      REJEITADO: DeliveryStatus.REJEITADO,

      // Mapeamentos alternativos para compatibilidade
      a_liberar: DeliveryStatus.A_LIBERAR,
      iniciado: DeliveryStatus.INICIADO,
      pendente: DeliveryStatus.INICIADO,
      finalizado: DeliveryStatus.FINALIZADO,
      rejeitado: DeliveryStatus.REJEITADO,
    };
    return mapping[statusMobile] || null;
  }
}
