import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
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

  async create(createDriverDto: CreateDriverDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    if (createDriverDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createDriverDto.userId },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário para associação não encontrado.');
      }

      if (user.tenantId !== tenantId) {
        throw new BadRequestException(
          'Usuário para associação não pertence ao mesmo tenant.',
        );
      }

      if (!user.role || user.role.name !== 'driver') {
        throw new BadRequestException(
          'O usuário selecionado não possui a role "driver".',
        );
      }

      const existingDriver = await this.prisma.driver.findUnique({
        where: { userId: createDriverDto.userId },
      });

      if (existingDriver) {
        throw new BadRequestException(
          'Este usuário já está associado a outro motorista.',
        );
      }
    }

    return this.prisma.driver.create({
      data: {
        ...createDriverDto,
        tenantId,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAllByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.driver.findMany({
      where: { tenantId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException(
        'Motorista não encontrado ou não pertence ao seu tenant.',
      );
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const driver = await this.prisma.driver.findUnique({
      where: { id, tenantId },
    });

    if (!driver) {
      throw new NotFoundException(
        'Motorista não encontrado ou não pertence ao seu tenant.',
      );
    }

    if (updateDriverDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateDriverDto.userId },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário para associação não encontrado.');
      }

      if (user.tenantId !== tenantId) {
        throw new BadRequestException(
          'Usuário para associação não pertence ao mesmo tenant.',
        );
      }

      if (!user.role || user.role.name !== 'driver') {
        throw new BadRequestException(
          'O usuário selecionado não possui a role "driver".',
        );
      }

      const existingDriver = await this.prisma.driver.findFirst({
        where: {
          userId: updateDriverDto.userId,
          id: { not: id },
        },
      });

      if (existingDriver) {
        throw new BadRequestException(
          'Este usuário já está associado a outro motorista.',
        );
      }
    }

    return this.prisma.driver.update({
      where: { id },
      data: updateDriverDto,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const driver = await this.prisma.driver.findUnique({
      where: { id, tenantId },
    });

    if (!driver) {
      throw new NotFoundException(
        'Motorista não encontrado ou não pertence ao seu tenant.',
      );
    }

    return this.prisma.driver.delete({
      where: { id },
    });
  }

  async findOrdersByAuthUser(userId: string) {
    const driver = await this.getDriverByUserId(userId);
    return this.prisma.order.findMany({
      where: { driverId: driver.id },
    });
  }

  async updateOrderStatus(orderId: string, status: string, userId: string) {
    const driver = await this.getDriverByUserId(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, tenantId: driver.tenantId, driverId: driver.id },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado ou não pertence a este motorista.',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status, updatedAt: new Date() },
    });
  }

  async saveProof(orderId: string, file: Express.Multer.File, userId: string) {
    const driver = await this.getDriverByUserId(userId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId, tenantId: driver.tenantId, driverId: driver.id },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado ou não pertence a este motorista.',
      );
    }

    const proofUrl = `path/to/your/proof/${file.filename}`;

    return this.prisma.deliveryProof.create({
      data: {
        Order: { connect: { id: orderId } },
        Driver: { connect: { id: driver.id } },
        Tenant: { connect: { id: driver.tenantId } },
        proofUrl,
        createdAt: new Date(),
      },
    });
  }

  async findPaymentsByAuthUser(userId: string) {
    const driver = await this.getDriverByUserId(userId);
    return this.prisma.payment.findMany({
      where: { driverId: driver.id },
    });
  }

  async getAvailableUsersByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    return this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        driver: null,
        role: {
          name: 'driver',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
            isPlatformRole: true,
          },
        },
      },
    });
  }
}
