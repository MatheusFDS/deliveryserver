import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenantId: dtoTenantId, ...data } = createCategoryDto;

    const tenantId = await this.getTenantIdFromUserId(userId);

    return this.prisma.category.create({
      data: {
        ...data,
        Tenant: {
          connect: { id: tenantId },
        },
      },
    });
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
        `Categoria com ID "${id}" não encontrada ou não pertence ao seu tenant.`,
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
        `Categoria com ID "${id}" não encontrada ou não pertence ao seu tenant.`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenantId: dtoTenantId, ...dataToUpdate } = updateCategoryDto;

    return this.prisma.category.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string, userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);

    const existingCategory = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!existingCategory) {
      throw new NotFoundException(
        `Categoria com ID "${id}" não encontrada ou não pertence ao seu tenant.`,
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
