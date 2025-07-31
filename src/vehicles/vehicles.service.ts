import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
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

    // Incluir cubagem e pesoMaximo nos dados de criação
    return this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        tenantId: tenantId,
      },
    });
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

    // Passa updateVehicleDto diretamente para data, incluindo cubagem e pesoMaximo
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

  async remove(id: string, userId: string) {
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
  }
}
