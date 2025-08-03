import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryService {
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

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    if (!createCategoryDto.name || createCategoryDto.valor === undefined) {
      throw new BadRequestException(
        'Nome e valor da categoria são obrigatórios.',
      );
    }

    const existingCategoryWithName = await this.prisma.category.findFirst({
      where: {
        name: { equals: createCategoryDto.name, mode: 'insensitive' },
        tenantId,
      },
    });

    if (existingCategoryWithName) {
      throw new ConflictException(
        `Já existe uma categoria com o nome "${createCategoryDto.name}" nesta empresa.`,
      );
    }

    try {
      return this.prisma.category.create({
        data: {
          ...createCategoryDto,
          tenantId: tenantId,
        },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          if (
            error.meta?.target &&
            Array.isArray(error.meta.target) &&
            error.meta.target.includes('name')
          ) {
            throw new ConflictException(
              `Já existe uma categoria com o nome "${createCategoryDto.name}" nesta empresa.`,
            );
          }
        }
      }

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Erro inesperado ao criar categoria:', error);
      throw new InternalServerErrorException(
        'Erro ao criar categoria. Por favor, tente novamente mais tarde.',
      );
    }
  }

  async findAllByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    return this.prisma.category.findMany({
      where: { tenantId },
    });
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException(
        'Categoria não encontrada ou não pertence ao seu tenant.',
      );
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const existingCategory = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!existingCategory) {
      throw new NotFoundException(
        'Categoria não encontrada ou não pertence ao seu tenant.',
      );
    }

    if (
      updateCategoryDto.name &&
      updateCategoryDto.name.trim().toLowerCase() !==
        existingCategory.name.trim().toLowerCase()
    ) {
      const existingCategoryWithSameName = await this.prisma.category.findFirst(
        {
          where: {
            name: {
              equals: updateCategoryDto.name.trim(),
              mode: 'insensitive',
            },
            tenantId,
            id: { not: id },
          },
        },
      );
      if (existingCategoryWithSameName) {
        throw new ConflictException(
          `Já existe outra categoria com o nome "${updateCategoryDto.name}" nesta empresa.`,
        );
      }
    }

    try {
      return this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          if (
            error.meta?.target &&
            Array.isArray(error.meta.target) &&
            error.meta.target.includes('name')
          ) {
            throw new ConflictException(
              `Já existe outra categoria com o nome "${updateCategoryDto.name}" nesta empresa.`,
            );
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

      console.error('Erro inesperado ao atualizar categoria:', error);
      throw new InternalServerErrorException(
        'Erro ao atualizar categoria. Por favor, tente novamente mais tarde.',
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      const tenantId = await this.getTenantIdFromUserId(userId);

      const existingCategory = await this.prisma.category.findFirst({
        where: { id, tenantId },
      });
      if (!existingCategory) {
        throw new NotFoundException(
          'Categoria não encontrada ou não pertence ao seu tenant.',
        );
      }

      // Check for related records (e.g., vehicles) before deleting
      const relatedVehicles = await this.prisma.vehicle.count({
        where: { categoryId: id, tenantId },
      });

      if (relatedVehicles > 0) {
        throw new BadRequestException(
          'Não é possível excluir esta categoria. Existem veículos associados a ela.',
        );
      }

      return await this.prisma.category.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003' || error.code === 'P2014') {
          throw new BadRequestException(
            'Não é possível excluir esta categoria. Ela possui registros relacionados.',
          );
        }
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Erro inesperado ao excluir categoria:', error);
      throw new InternalServerErrorException(
        'Erro ao excluir categoria. Por favor, tente novamente mais tarde.',
      );
    }
  }
}
