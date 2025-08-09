import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
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

    try {
      return this.prisma.vehicle.create({
        data: {
          ...createVehicleDto,
          tenantId: tenantId,
        },
      });
    } catch (error: any) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }

      console.error('Erro inesperado ao criar veículo:', error);
      throw new InternalServerErrorException(
        'Erro inesperado ao criar veículo. Por favor, tente novamente mais tarde.',
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
        // CORREÇÃO: camelCase
        { driver: { is: { name: { contains: search, mode: 'insensitive' } } } },
        {
          // CORREÇÃO: camelCase
          category: { is: { name: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }

    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take,
        include: {
          // CORREÇÃO: camelCase
          driver: {
            select: { name: true },
          },
          // CORREÇÃO: camelCase
          category: {
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

    try {
      return this.prisma.vehicle.update({
        where: { id },
        data: updateVehicleDto,
      });
    } catch (error: any) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }

      console.error('Erro inesperado ao atualizar veículo:', error);
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar veículo. Por favor, tente novamente mais tarde.',
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }

      console.error('Erro inesperado ao excluir veículo:', error);
      throw new InternalServerErrorException(
        'Erro ao excluir veículo. Por favor, tente novamente mais tarde.',
      );
    }
  }
}
