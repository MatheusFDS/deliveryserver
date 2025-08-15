import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDirectionsDto } from './dto/create-directions.dto';
import { UpdateDirectionsDto } from './dto/update-directions.dto';
import { Prisma } from '@prisma/client';

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

  private async generateTenantCode(
    tx: Prisma.TransactionClient,
    tenantId: string,
    entityType: string,
    prefix: string,
  ): Promise<string> {
    const sequence = await tx.sequence.upsert({
      where: {
        entityType_tenantId: { entityType, tenantId },
      },
      update: {
        nextValue: {
          increment: 1,
        },
      },
      create: {
        entityType,
        tenantId,
        nextValue: 2,
      },
      select: {
        nextValue: true,
      },
    });
    const currentValue = sequence.nextValue - 1;
    return `${prefix}-${String(currentValue).padStart(6, '0')}`;
  }

  private async checkOverlap(
    tenantId: string,
    rangeInicio: string,
    rangeFim: string,
    currentId?: string,
  ) {
    if (rangeInicio > rangeFim) {
      throw new BadRequestException(
        'O CEP inicial deve ser menor ou igual ao CEP final.',
      );
    }

    const whereClause: Prisma.DirectionsWhereInput = {
      tenantId,
      rangeFim: { gte: rangeInicio },
      rangeInicio: { lte: rangeFim },
    };

    if (currentId) {
      whereClause.id = { not: currentId };
    }

    const overlappingDirection = await this.prisma.directions.findFirst({
      where: whereClause,
    });

    if (overlappingDirection) {
      throw new ConflictException(
        `A faixa de CEP ${rangeInicio}-${rangeFim} conflita com a região já existente "${overlappingDirection.regiao}" (${overlappingDirection.rangeInicio}-${overlappingDirection.rangeFim}).`,
      );
    }
  }

  async create(createDirectionsDto: CreateDirectionsDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const existingRegion = await this.prisma.directions.findFirst({
      where: {
        regiao: { equals: createDirectionsDto.regiao, mode: 'insensitive' },
        tenantId,
      },
    });
    if (existingRegion) {
      throw new ConflictException(
        `Já existe uma região com o nome "${createDirectionsDto.regiao}".`,
      );
    }

    await this.checkOverlap(
      tenantId,
      createDirectionsDto.rangeInicio,
      createDirectionsDto.rangeFim,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const code = await this.generateTenantCode(
          tx,
          tenantId,
          'DIRECTIONS',
          'REG',
        );

        return await tx.directions.create({
          data: {
            ...createDirectionsDto,
            tenantId,
            code,
          },
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao criar a região.',
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

    const where: Prisma.DirectionsWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { regiao: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [directions, total] = await this.prisma.$transaction([
        this.prisma.directions.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.directions.count({ where }),
      ]);

      return {
        data: directions,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar as regiões.',
      );
    }
  }

  async findAllByTenant(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    try {
      return await this.prisma.directions.findMany({
        where: { tenantId },
        orderBy: { regiao: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar todas as regiões.',
      );
    }
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const direction = await this.prisma.directions.findFirst({
      where: { id, tenantId },
    });
    if (!direction) {
      throw new NotFoundException(
        'Região não encontrada ou não pertence à sua empresa.',
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
        'Região não encontrada ou não pertence à sua empresa.',
      );
    }

    if (
      updateDirectionsDto.regiao &&
      updateDirectionsDto.regiao !== existingDirection.regiao
    ) {
      const existingRegion = await this.prisma.directions.findFirst({
        where: {
          regiao: { equals: updateDirectionsDto.regiao, mode: 'insensitive' },
          tenantId,
          id: { not: id },
        },
      });
      if (existingRegion) {
        throw new ConflictException(
          `Já existe outra região com o nome "${updateDirectionsDto.regiao}".`,
        );
      }
    }

    const newRangeInicio =
      updateDirectionsDto.rangeInicio ?? existingDirection.rangeInicio;
    const newRangeFim =
      updateDirectionsDto.rangeFim ?? existingDirection.rangeFim;

    await this.checkOverlap(tenantId, newRangeInicio, newRangeFim, id);

    try {
      return await this.prisma.directions.update({
        where: { id },
        data: updateDirectionsDto,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar a região.',
      );
    }
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const existingDirection = await this.prisma.directions.findFirst({
      where: { id, tenantId },
    });
    if (!existingDirection) {
      throw new NotFoundException(
        'Região não encontrada ou não pertence à sua empresa.',
      );
    }

    try {
      return await this.prisma.directions.delete({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao excluir a região.',
      );
    }
  }
}
