import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDirectionsDto } from './dto/create-directions.dto';
import { UpdateDirectionsDto } from './dto/update-directions.dto';

@Injectable()
export class DirectionsService {
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

  async create(createDirectionsDto: CreateDirectionsDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    return this.prisma.directions.create({
      data: {
        ...createDirectionsDto,
        tenantId,
      },
    });
  }

  async findAllByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.directions.findMany({ where: { tenantId } });
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const direction = await this.prisma.directions.findFirst({
      where: { id, tenantId },
    });
    if (!direction) {
      throw new NotFoundException(
        `Direção com ID "${id}" não encontrada ou não pertence ao seu tenant.`,
      );
    }
    return direction;
  }

  async update(
    id: string,
    updateDirectionsDto: UpdateDirectionsDto,
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const existingDirection = await this.prisma.directions.findFirst({
      where: { id, tenantId },
    });
    if (!existingDirection) {
      throw new NotFoundException(
        `Direção com ID "${id}" não encontrada ou não pertence ao seu tenant.`,
      );
    }

    return this.prisma.directions.update({
      where: { id },
      data: updateDirectionsDto,
    });
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const existingDirection = await this.prisma.directions.findFirst({
      where: { id, tenantId },
    });
    if (!existingDirection) {
      throw new NotFoundException(
        `Direção com ID "${id}" não encontrada ou não pertence ao seu tenant.`,
      );
    }

    return this.prisma.directions.delete({
      where: { id },
    });
  }
}
