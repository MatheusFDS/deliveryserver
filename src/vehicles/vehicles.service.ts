import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

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

    try {
      // <-- Try começa mais cedo
      // Validação de unicidade para 'model' dentro do tenant
      const existingModel = await this.prisma.vehicle.findFirst({
        where: { model: createVehicleDto.model, tenantId },
      });
      if (existingModel) {
        throw new ConflictException(
          `Já existe um veículo com o modelo "${createVehicleDto.model}" nesta empresa.`,
        );
      }

      return this.prisma.vehicle.create({
        data: {
          ...createVehicleDto,
          tenantId: tenantId,
        },
      });
    } catch (error: any) {
      console.log('VehiclesService - Erro capturado no create:', error.code);
      if (error.code === 'P2002' && error.meta?.target?.includes('plate')) {
        console.log(
          'VehiclesService - Lançando ConflictException para placa duplicada.',
        );
        throw new ConflictException(
          `Já existe um veículo com a placa "${createVehicleDto.plate}" nesta empresa.`,
        );
      }
      if (error instanceof ConflictException) {
        // Re-lança a exceção de conflito de modelo
        throw error;
      }
      throw new BadRequestException('Erro ao criar veículo.');
    }
  }

  async findAllByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.vehicle.findMany({ where: { tenantId } });
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

    try {
      // <-- Try começa mais cedo
      // Validação de unicidade para 'model' se estiver sendo atualizado
      if (
        updateVehicleDto.model &&
        updateVehicleDto.model !== existingVehicle.model
      ) {
        const existingModel = await this.prisma.vehicle.findFirst({
          where: { model: updateVehicleDto.model, tenantId, id: { not: id } },
        });
        if (existingModel) {
          throw new ConflictException(
            `Já existe outro veículo com o modelo "${updateVehicleDto.model}" nesta empresa.`,
          );
        }
      }

      return this.prisma.vehicle.update({
        where: { id },
        data: updateVehicleDto,
      });
    } catch (error: any) {
      console.log('VehiclesService - Erro capturado no update:', error.code);
      if (error.code === 'P2002' && error.meta?.target?.includes('plate')) {
        throw new ConflictException(
          `Já existe outro veículo com a placa "${updateVehicleDto.plate}" nesta empresa.`,
        );
      }
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Erro ao atualizar veículo.');
    }
  }

  async remove(id: string, userId: string) {
    try {
      // <-- Try começa mais cedo aqui
      const tenantId = await this.getTenantIdFromUserId(userId);

      const existingVehicle = await this.prisma.vehicle.findFirst({
        where: { id, tenantId },
      });
      if (!existingVehicle) {
        throw new NotFoundException(
          'Veículo não encontrado ou não pertence ao seu tenant.',
        );
      }

      return this.prisma.vehicle.delete({ where: { id } });
    } catch (error: any) {
      console.log('VehiclesService - Erro capturado no remove:', error.code);
      if (error.code === 'P2003' || error.code === 'P2014') {
        console.log(
          'VehiclesService - Lançando BadRequestException para chave estrangeira.',
        );
        throw new BadRequestException(
          'Não é possível excluir este veículo. Ele possui registros relacionados (ex: entregas, pedidos).',
        );
      }
      // Se não for um P2003/P2014, verificar se já é uma HttpException (NotFoundException)
      if (error instanceof NotFoundException) {
        throw error; // Re-lança NotFoundException
      }
      console.log(
        'VehiclesService - Lançando BadRequestException genérico no remove.',
      );
      throw new BadRequestException('Erro ao excluir veículo.');
    }
  }
}
