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

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: { equals: createCategoryDto.name, mode: 'insensitive' },
        tenantId,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Já existe uma categoria com o nome "${createCategoryDto.name}" nesta empresa.`,
      );
    }

    try {
      return await this.prisma.category.create({
        data: {
          ...createCategoryDto,
          tenantId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao criar a categoria.',
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

    const where: Prisma.CategoryWhereInput = {
      tenantId,
    };

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    try {
      const [categories, total] = await this.prisma.$transaction([
        this.prisma.category.findMany({
          where,
          skip,
          take,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.category.count({ where }),
      ]);

      return {
        data: categories,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar as categorias.',
      );
    }
  }

  async findOneByIdAndUserId(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException(
        'Categoria não encontrada ou não pertence à sua empresa.',
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
    const categoryToUpdate = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!categoryToUpdate) {
      throw new NotFoundException(
        'Categoria não encontrada ou não pertence à sua empresa.',
      );
    }

    if (
      updateCategoryDto.name &&
      updateCategoryDto.name.trim().toLowerCase() !==
        categoryToUpdate.name.trim().toLowerCase()
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
          `Já existe outra categoria com o nome "${updateCategoryDto.name}".`,
        );
      }
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar a categoria.',
      );
    }
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const categoryToRemove = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!categoryToRemove) {
      throw new NotFoundException(
        'Categoria não encontrada ou não pertence à sua empresa.',
      );
    }

    const relatedVehiclesCount = await this.prisma.vehicle.count({
      where: { categoryId: id, tenantId },
    });

    if (relatedVehiclesCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir esta categoria, pois existem veículos associados a ela.',
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });
      return { message: 'Categoria excluída com sucesso.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao excluir a categoria.',
      );
    }
  }

  async findAllByTenant(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    try {
      return await this.prisma.category.findMany({
        where: { tenantId },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar as categorias.',
      );
    }
  }
}
