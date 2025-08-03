import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
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

  async create(createVehicleDto: CreateVehicleDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const driver = await this.prisma.driver.findFirst({
      where: { id: createVehicleDto.driverId, tenantId },
    });
    if (!driver) {
      throw new BadRequestException(
        'Motorista inválido ou não pertence ao seu tenant.',
      );
    }

    const category = await this.prisma.category.findFirst({
      where: { id: createVehicleDto.categoryId, tenantId },
    });
    if (!category) {
      throw new BadRequestException(
        'Categoria inválida ou não pertence ao seu tenant.',
      );
    }

    const existingVehicleWithSamePlate = await this.prisma.vehicle.findFirst({
      where: { plate: createVehicleDto.plate, tenantId },
    });
    if (existingVehicleWithSamePlate) {
      throw new ConflictException(
        `Já existe um veículo com a placa "${createVehicleDto.plate}" nesta empresa.`,
      );
    }

    const existingVehicleWithSameModel = await this.prisma.vehicle.findFirst({
      where: { model: createVehicleDto.model, tenantId },
    });
    if (existingVehicleWithSameModel) {
      throw new ConflictException(
        `Já existe um veículo com o modelo "${createVehicleDto.model}" nesta empresa.`,
      );
    }

    try {
      return this.prisma.vehicle.create({
        data: {
          ...createVehicleDto,
          tenantId: tenantId,
        },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          if (error.meta?.target && Array.isArray(error.meta.target)) {
            if (error.meta.target.includes('plate')) {
              throw new ConflictException(
                `Já existe um veículo com a placa "${createVehicleDto.plate}" nesta empresa.`,
              );
            }
            if (error.meta.target.includes('model')) {
              throw new ConflictException(
                `Já existe um veículo com o modelo "${createVehicleDto.model}" nesta empresa.`,
              );
            }
          }
        }
      }

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Erro inesperado ao criar veículo:', error);
      throw new InternalServerErrorException(
        'Erro ao criar veículo. Por favor, tente novamente mais tarde.',
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

    const where: Prisma.VehicleWhereInput = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { model: { contains: search, mode: 'insensitive' } },
        { plate: { contains: search, mode: 'insensitive' } },
        { Driver: { is: { name: { contains: search, mode: 'insensitive' } } } },
        {
          Category: { is: { name: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }

    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take,
        include: {
          Driver: {
            select: { name: true },
          },
          Category: {
            select: { name: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: vehicles,
      total,
      page,
      pageSize,
      lastPage: Math.ceil(total / pageSize),
    };
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
    });
    if (!vehicle) {
      throw new NotFoundException(
        'Veículo não encontrado ou não pertence ao seu tenant.',
      );
    }
    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
    });
    if (!existingVehicle) {
      throw new NotFoundException(
        'Veículo não encontrado ou não pertence ao seu tenant.',
      );
    }

    if (updateVehicleDto.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: updateVehicleDto.driverId, tenantId },
      });
      if (!driver) {
        throw new BadRequestException(
          'Motorista inválido ou não pertence ao seu tenant.',
        );
      }
    }

    if (updateVehicleDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: updateVehicleDto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException(
          'Categoria inválida ou não pertence ao seu tenant.',
        );
      }
    }

    if (
      updateVehicleDto.plate &&
      updateVehicleDto.plate.trim().toUpperCase() !==
        existingVehicle.plate.trim().toUpperCase()
    ) {
      const existingVehicleWithSamePlate = await this.prisma.vehicle.findFirst({
        where: {
          plate: updateVehicleDto.plate.trim().toUpperCase(),
          tenantId,
          id: { not: id },
        },
      });
      if (existingVehicleWithSamePlate) {
        throw new ConflictException(
          `Já existe outro veículo com a placa "${updateVehicleDto.plate}" nesta empresa.`,
        );
      }
    }

    if (
      updateVehicleDto.model &&
      updateVehicleDto.model.trim() !== existingVehicle.model
    ) {
      const existingVehicleWithSameModel = await this.prisma.vehicle.findFirst({
        where: {
          model: updateVehicleDto.model.trim(),
          tenantId,
          id: { not: id },
        },
      });
      if (existingVehicleWithSameModel) {
        throw new ConflictException(
          `Já existe outro veículo com o modelo "${updateVehicleDto.model}" nesta empresa.`,
        );
      }
    }

    try {
      return this.prisma.vehicle.update({
        where: { id },
        data: updateVehicleDto,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          if (error.meta?.target && Array.isArray(error.meta.target)) {
            if (error.meta.target.includes('plate')) {
              throw new ConflictException(
                `Já existe outro veículo com a placa "${updateVehicleDto.plate}" nesta empresa.`,
              );
            }
            if (error.meta.target.includes('model')) {
              throw new ConflictException(
                `Já existe outro veículo com o modelo "${updateVehicleDto.model}" nesta empresa.`,
              );
            }
          }
        }
      }

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Erro inesperado ao atualizar veículo:', error);
      throw new InternalServerErrorException(
        'Erro ao atualizar veículo. Por favor, tente novamente mais tarde.',
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      const tenantId = await this.getTenantIdFromUserId(userId);

      const existingVehicle = await this.prisma.vehicle.findFirst({
        where: { id, tenantId },
      });
      if (!existingVehicle) {
        throw new NotFoundException(
          'Veículo não encontrado ou não pertence ao seu tenant.',
        );
      }

      return await this.prisma.vehicle.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003' || error.code === 'P2014') {
          throw new BadRequestException(
            'Não é possível excluir este veículo. Ele possui registros relacionados (ex: entregas, pedidos).',
          );
        }
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Erro inesperado ao excluir veículo:', error);
      throw new InternalServerErrorException(
        'Erro ao excluir veículo. Por favor, tente novamente mais tarde.',
      );
    }
  }
}
