import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  private async getRequestingUserWithRole(requestingUserId: string): Promise<{
    id: string;
    role: { name: string; isPlatformRole: boolean };
    tenantId: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: {
        id: true,
        role: { select: { name: true, isPlatformRole: true } },
        tenantId: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário solicitante não encontrado.');
    }
    return user;
  }

  // ==============================================================
  // OPERAÇÕES DE TENANT - NÍVEL DE TENANT (Admin do Tenant)
  // ==============================================================

  async getTenantByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Usuário não associado a um tenant.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(
        `Tenant com ID ${user.tenantId} não encontrado.`,
      );
    }
    return tenant;
  }

  async updateTenant(
    requestingUserId: string,
    tenantToUpdateId: string,
    data: UpdateTenantDto,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);

    if (requestingUser.role.name !== 'admin') {
      throw new ForbiddenException(
        'Sua role não permite a atualização de tenants.',
      );
    }

    if (
      !requestingUser.tenantId ||
      requestingUser.tenantId !== tenantToUpdateId
    ) {
      throw new ForbiddenException(
        'Você só pode atualizar o seu próprio tenant.',
      );
    }

    try {
      return this.prisma.tenant.update({
        where: { id: tenantToUpdateId },
        data,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar a empresa.',
      );
    }
  }

  // ==============================================================
  // OPERAÇÕES DE TENANT - NÍVEL DE PLATAFORMA (Superadmin)
  // ==============================================================

  async createTenantByPlatformAdmin(
    createTenantDto: CreateTenantDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem criar novos tenants.',
      );
    }

    try {
      return await this.prisma.tenant.create({
        data: {
          ...createTenantDto,
          isActive: true,
        },
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[])?.join(', ') || 'campo';
        throw new ConflictException(
          `Uma empresa com este ${target} já existe.`,
        );
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao criar a empresa.',
      );
    }
  }

  async getAllTenantsByPlatformAdmin(
    requestingUserId: string,
    search?: string,
    includeInactive?: boolean,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem listar todos os tenants.',
      );
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const where: Prisma.TenantWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    try {
      const [tenants, total] = await this.prisma.$transaction([
        this.prisma.tenant.findMany({
          where,
          skip,
          take,
          orderBy: { name: 'asc' },
        }),
        this.prisma.tenant.count({ where }),
      ]);

      return {
        data: tenants,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar as empresas.',
      );
    }
  }

  async getTenantByIdByPlatformAdmin(
    tenantId: string,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem ver detalhes de tenants.',
      );
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Empresa com ID ${tenantId} não encontrada.`);
    }
    return tenant;
  }

  async updateTenantByPlatformAdmin(
    tenantId: string,
    updateTenantDto: UpdateTenantDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem atualizar tenants.',
      );
    }

    try {
      return await this.prisma.tenant.update({
        where: { id: tenantId },
        data: updateTenantDto,
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Empresa com ID ${tenantId} não encontrada.`,
          );
        }
        if (error.code === 'P2002') {
          const target =
            (error.meta?.target as string[])?.join(', ') || 'campo';
          throw new ConflictException(
            `Uma empresa com este ${target} já existe.`,
          );
        }
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar a empresa.',
      );
    }
  }

  async deleteTenantByPlatformAdmin(
    tenantId: string,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem deletar tenants.',
      );
    }
    try {
      return await this.prisma.tenant.delete({
        where: { id: tenantId },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Empresa com ID ${tenantId} não encontrada.`,
          );
        }
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Não é possível excluir esta empresa pois existem registros (usuários, veículos, etc.) vinculados a ela.',
          );
        }
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao excluir a empresa.',
      );
    }
  }
}
