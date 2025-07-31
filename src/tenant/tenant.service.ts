import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantService {
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

  activateTenant() {
    throw new Error('Method not implemented.');
  }

  getTenantSettings() {
    throw new Error('Method not implemented.');
  }

  async getTenantByUserId(userId: string) {
    const tenantId = await this.getTenantIdFromUserId(userId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${tenantId} não encontrado.`);
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
    if (
      requestingUser.role.name !== 'admin' &&
      requestingUser.role.name !== 'superadmin'
    ) {
      throw new ForbiddenException(
        'Sua role não permite a atualização de tenants.',
      );
    }

    const actualTenantId = requestingUser.tenantId;
    if (!actualTenantId || actualTenantId !== tenantToUpdateId) {
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
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Tenant com ID ${tenantToUpdateId} não encontrado.`,
        );
      }
      throw new BadRequestException(
        'Erro ao atualizar tenant no banco de dados.',
      );
    }
  }

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
      const newTenant = await this.prisma.tenant.create({
        data: {
          ...createTenantDto,
          isActive: true,
        },
      });
      return newTenant;
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('domain')) {
        throw new BadRequestException('Um tenant com este domínio já existe.');
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new BadRequestException('Um tenant com este nome já existe.');
      }
      throw new BadRequestException('Erro ao criar tenant.');
    }
  }

  async getAllTenantsByPlatformAdmin(requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem listar todos os tenants.',
      );
    }
    return this.prisma.tenant.findMany();
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
      throw new NotFoundException(`Tenant com ID ${tenantId} não encontrado.`);
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
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Tenant com ID ${tenantId} não encontrado.`,
        );
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('domain')) {
        throw new BadRequestException('Um tenant com este domínio já existe.');
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new BadRequestException('Um tenant com este nome já existe.');
      }
      throw new BadRequestException('Erro ao atualizar tenant.');
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
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Tenant com ID ${tenantId} não encontrado.`,
        );
      } else if (error.code === 'P2003' || error.code === 'P2014') {
        throw new BadRequestException(
          `Não é possível deletar o tenant com ID ${tenantId} devido a registros relacionados existentes.`,
        );
      }
      throw new BadRequestException('Erro ao deletar tenant.');
    }
  }
}
