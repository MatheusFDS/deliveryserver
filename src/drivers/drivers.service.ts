import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Prisma, OrderStatus } from '@prisma/client';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async createFromInvite(
    profileData: {
      name: string;
      email: string;
      password?: string;
      cpf?: string;
      license?: string;
      firebaseUid: string;
    },
    invite: { tenantId: string; roleId: string },
  ) {
    if (!profileData.password) {
      throw new BadRequestException('Senha é obrigatória para criar a conta.');
    }
    if (!profileData.cpf || !profileData.license) {
      throw new BadRequestException(
        'CPF e CNH são obrigatórios para motoristas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: profileData.email,
          name: profileData.name,
          password: profileData.password,
          tenantId: invite.tenantId,
          roleId: invite.roleId,
          firebaseUid: profileData.firebaseUid,
          isActive: true,
        },
      });

      await tx.driver.create({
        data: {
          name: user.name,
          cpf: profileData.cpf,
          license: profileData.license,
          tenantId: invite.tenantId,
          userId: user.id,
        },
      });

      return user;
    });
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

    const existingDriverWithName = await this.prisma.driver.findFirst({
      where: {
        name: { equals: createDriverDto.name, mode: 'insensitive' },
        tenantId,
      },
    });
    if (existingDriverWithName) {
      throw new ConflictException(
        `Já existe um motorista com o nome "${createDriverDto.name}" nesta empresa.`,
      );
    }

    const existingDriverWithCpf = await this.prisma.driver.findFirst({
      where: { cpf: createDriverDto.cpf, tenantId },
    });
    if (existingDriverWithCpf) {
      throw new ConflictException(
        `Já existe um motorista com o CPF "${createDriverDto.cpf}" nesta empresa.`,
      );
    }

    if (createDriverDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createDriverDto.userId },
        include: { role: { select: { name: true } } },
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
      const existingDriverWithUser = await this.prisma.driver.findUnique({
        where: { userId: createDriverDto.userId },
      });
      if (existingDriverWithUser) {
        throw new ConflictException(
          'Este usuário já está associado a outro motorista.',
        );
      }
    }

    try {
      return this.prisma.driver.create({
        data: { ...createDriverDto, tenantId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao criar o motorista.',
      );
    }
  }

  async findAllByUserId(
    userId: string,
    search?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.DriverWhereInput = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
        { license: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    try {
      const [drivers, total] = await this.prisma.$transaction([
        this.prisma.driver.findMany({
          where,
          skip,
          take,
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.driver.count({ where }),
      ]);

      return {
        data: drivers,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar os motoristas.',
      );
    }
  }

  async findAllByTenant(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    try {
      return await this.prisma.driver.findMany({
        where: { tenantId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar todos os motoristas.',
      );
    }
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId },
      include: {
        user: {
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
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId },
    });
    if (!driver) {
      throw new NotFoundException(
        'Motorista não encontrado ou não pertence à sua empresa.',
      );
    }

    if (updateDriverDto.name && updateDriverDto.name !== driver.name) {
      const existingDriverWithName = await this.prisma.driver.findFirst({
        where: {
          name: { equals: updateDriverDto.name, mode: 'insensitive' },
          tenantId,
          id: { not: id },
        },
      });
      if (existingDriverWithName) {
        throw new ConflictException(
          `Já existe outro motorista com o nome "${updateDriverDto.name}" nesta empresa.`,
        );
      }
    }

    if (updateDriverDto.cpf && updateDriverDto.cpf !== driver.cpf) {
      const existingDriverWithCpf = await this.prisma.driver.findFirst({
        where: { cpf: updateDriverDto.cpf, tenantId, id: { not: id } },
      });
      if (existingDriverWithCpf) {
        throw new ConflictException(
          `Já existe outro motorista com o CPF "${updateDriverDto.cpf}" nesta empresa.`,
        );
      }
    }

    if (updateDriverDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateDriverDto.userId },
        include: { role: { select: { name: true } } },
      });

      if (!user)
        throw new NotFoundException('Usuário para associação não encontrado.');
      if (user.tenantId !== tenantId)
        throw new BadRequestException(
          'Usuário para associação não pertence ao mesmo tenant.',
        );
      if (!user.role || user.role.name !== 'driver')
        throw new BadRequestException(
          'O usuário selecionado não possui a role "driver".',
        );

      const existingDriverWithUser = await this.prisma.driver.findFirst({
        where: { userId: updateDriverDto.userId, id: { not: id } },
      });
      if (existingDriverWithUser) {
        throw new ConflictException(
          'Este usuário já está associado a outro motorista.',
        );
      }
    }

    try {
      return this.prisma.driver.update({
        where: { id },
        data: updateDriverDto,
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar o motorista.',
      );
    }
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId },
    });
    if (!driver) {
      throw new NotFoundException(
        'Motorista não encontrado ou не pertence à sua empresa.',
      );
    }

    const relatedVehicles = await this.prisma.vehicle.count({
      where: { driverId: id, tenantId },
    });
    if (relatedVehicles > 0) {
      throw new BadRequestException(
        'Não é possível excluir. Este motorista está associado a um ou mais veículos.',
      );
    }

    try {
      return await this.prisma.driver.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao excluir o motorista.',
      );
    }
  }

  async findOrdersByAuthUser(userId: string) {
    const driver = await this.getDriverByUserId(userId);
    return this.prisma.order.findMany({
      where: { driverId: driver.id },
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    userId: string,
  ) {
    const driver = await this.getDriverByUserId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: driver.tenantId, driverId: driver.id },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado ou не pertence a este motorista.',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status, updatedAt: new Date() },
    });
  }

  async saveProof(orderId: string, file: Express.Multer.File, userId: string) {
    const driver = await this.getDriverByUserId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId: driver.tenantId, driverId: driver.id },
    });
    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado ou не pertence a este motorista.',
      );
    }

    const proofUrl = `path/to/your/proof/${file.filename}`;

    return this.prisma.deliveryProof.create({
      data: {
        order: { connect: { id: orderId } },
        driver: { connect: { id: driver.id } },
        tenant: { connect: { id: driver.tenantId } },
        proofUrl,
        createdAt: new Date(),
      },
    });
  }

  async getAvailableUsersByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        driver: null,
        role: { name: 'driver' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { id: true, name: true, isPlatformRole: true } },
      },
    });
  }
}
