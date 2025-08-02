import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
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

  private async getRequestingUserWithRoleAndTenant(
    requestingUserId: string,
  ): Promise<{
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

  changePassword() {
    throw new Error('Method not implemented.');
  }

  resetPassword() {
    throw new Error('Method not implemented.');
  }

  // ==============================================================
  // OPERAÇÕES DE USUÁRIO - NÍVEL DE TENANT (Admin do Tenant)
  // ==============================================================

  async createUserForTenant(
    createUserDto: CreateUserDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    if (
      requestingUser.role.name !== 'admin' &&
      requestingUser.role.name !== 'superadmin'
    ) {
      throw new ForbiddenException(
        'Sua role não permite a criação de novos usuários neste tenant.',
      );
    }

    const requestingUserTenantId = requestingUser.tenantId;
    if (!requestingUserTenantId) {
      throw new ForbiddenException(
        'Administrador não associado a um tenant para criar usuário.',
      );
    }

    const { password, roleId, ...data } = createUserDto;

    const targetRole = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, isPlatformRole: true },
    });
    if (!targetRole) {
      throw new BadRequestException('Role especificada não existe.');
    }

    if (
      targetRole.name === 'admin' ||
      targetRole.name === 'superadmin' ||
      targetRole.isPlatformRole
    ) {
      throw new ForbiddenException(
        'Administradores de tenant não podem criar usuários com esta role ou roles de plataforma.',
      );
    }

    if (targetRole.name === 'admin') {
      const existingAdmin = await this.prisma.user.findFirst({
        where: {
          tenantId: requestingUserTenantId,
          role: { name: 'admin' },
          isActive: true,
        },
      });
      if (existingAdmin) {
        throw new BadRequestException(
          'Já existe um administrador ativo para esta empresa. Somente um administrador por empresa é permitido.',
        );
      }
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email, tenantId: requestingUserTenantId },
    });
    if (existingUser) {
      throw new BadRequestException(
        'Já existe um usuário com este email para o seu tenant.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        tenantId: requestingUserTenantId,
        roleId: roleId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllByTenant(requestingUserId: string) {
    const requestingUserTenantId =
      await this.getTenantIdFromUserId(requestingUserId);

    return this.prisma.user.findMany({
      where: { tenantId: requestingUserTenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOneById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado.`);
    }
    return user;
  }

  async findOneByIdAndTenant(id: string, requestingUserId: string) {
    const requestingUserTenantId =
      await this.getTenantIdFromUserId(requestingUserId);

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: requestingUserTenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(
        `Usuário com ID ${id} não encontrado ou não pertence ao seu tenant.`,
      );
    }
    return user;
  }

  async updateUserForTenant(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    if (
      requestingUser.role.name !== 'admin' &&
      requestingUser.role.name !== 'superadmin'
    ) {
      throw new ForbiddenException(
        'Sua role não permite a atualização de usuários neste tenant.',
      );
    }

    const requestingUserTenantId = requestingUser.tenantId;
    if (!requestingUserTenantId) {
      throw new ForbiddenException(
        'Administrador não associado a um tenant para atualizar usuário.',
      );
    }

    const userToUpdate = await this.prisma.user.findFirst({
      where: { id, tenantId: requestingUserTenantId },
      include: { role: true },
    });
    if (!userToUpdate) {
      throw new NotFoundException(
        `Usuário com ID ${id} não encontrado ou não pertence ao seu tenant.`,
      );
    }

    if (
      requestingUser.role.name === 'admin' &&
      (userToUpdate.role.name === 'superadmin' ||
        userToUpdate.role.name === 'admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar usuários com esta role.',
      );
    }

    if (
      requestingUserId === id &&
      updateUserDto.isActive === false &&
      requestingUser.role.name === 'admin'
    ) {
      throw new BadRequestException('Administradores não podem se inativar.');
    }

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    let targetRole: { name: string; isPlatformRole: boolean } | null = null;

    if (updateUserDto.roleId) {
      targetRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
        select: { name: true, isPlatformRole: true },
      });
      if (!targetRole) {
        throw new BadRequestException(
          'Role especificada para atualização não existe.',
        );
      }

      if (targetRole.name === 'admin') {
        const existingAdmin = await this.prisma.user.findFirst({
          where: {
            tenantId: requestingUserTenantId,
            role: { name: 'admin' },
            isActive: true,
            id: { not: id },
          },
        });
        if (existingAdmin) {
          throw new BadRequestException(
            'Já existe outro administrador ativo para esta empresa. Somente um administrador por empresa é permitido.',
          );
        }
      }

      if (requestingUser.role.name === 'admin') {
        if (
          targetRole.name === 'admin' ||
          targetRole.name === 'superadmin' ||
          targetRole.isPlatformRole
        ) {
          throw new ForbiddenException(
            'Administradores de tenant não podem atribuir esta role ou roles de plataforma.',
          );
        }
        if (
          userToUpdate.role.name === 'admin' ||
          userToUpdate.role.name === 'superadmin' ||
          userToUpdate.role.isPlatformRole
        ) {
          throw new ForbiddenException(
            'Administradores de tenant não podem alterar a role de usuários com esta role ou roles de plataforma.',
          );
        }
      }
    } else {
    }

    return this.prisma.user.update({
      where: { id, tenantId: requestingUserTenantId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async inactivateUserForTenant(id: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    if (
      requestingUser.role.name !== 'admin' &&
      requestingUser.role.name !== 'superadmin'
    ) {
      throw new ForbiddenException(
        'Sua role não permite a inativação de usuários neste tenant.',
      );
    }

    const requestingUserTenantId = requestingUser.tenantId;
    if (!requestingUserTenantId && requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Administrador não associado a um tenant para inativar usuário.',
      );
    }

    const userToInactivate = await this.prisma.user.findFirst({
      where: { id, tenantId: requestingUserTenantId },
      include: { role: true },
    });
    if (!userToInactivate) {
      throw new NotFoundException(
        `Usuário com ID ${id} não encontrado ou não pertence ao seu tenant.`,
      );
    }

    if (
      requestingUser.role.name === 'admin' &&
      (userToInactivate.role.name === 'superadmin' ||
        userToInactivate.role.name === 'admin')
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para inativar usuários com esta role.',
      );
    }

    if (requestingUserId === id && requestingUser.role.name === 'admin') {
      throw new BadRequestException('Administradores não podem se inativar.');
    }

    if (userToInactivate.role.name === 'admin' && userToInactivate.isActive) {
      const activeAdminsInTenant = await this.prisma.user.count({
        where: {
          tenantId: requestingUserTenantId,
          role: { name: 'admin' },
          isActive: true,
          id: { not: id },
        },
      });
      if (activeAdminsInTenant < 1) {
        throw new BadRequestException(
          'Não é possível inativar o único administrador ativo desta empresa. Deve haver pelo menos um administrador ativo por empresa.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ==============================================================
  // OPERAÇÕES DE USUÁRIO - NÍVEL DE PLATAFORMA (Superadmin)
  // ==============================================================

  async createPlatformUser(
    createUserDto: CreateUserDto,
    requestingUserId: string,
    targetTenantId?: string | null,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem criar usuários de plataforma.',
      );
    }

    const { password, roleId, ...data } = createUserDto;

    const targetRole = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, isPlatformRole: true },
    });
    if (!targetRole) {
      throw new BadRequestException('Role especificada não existe.');
    }

    if (targetTenantId) {
      const targetTenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
      });
      if (!targetTenant) {
        throw new NotFoundException(
          `Tenant com ID ${targetTenantId} não encontrado.`,
        );
      }
      if (targetRole.name === 'admin') {
        const existingAdmin = await this.prisma.user.findFirst({
          where: {
            tenantId: targetTenantId,
            role: { name: 'admin' },
            isActive: true,
          },
        });
        if (existingAdmin) {
          throw new BadRequestException(
            'Já existe um administrador ativo para esta empresa. Somente um administrador por empresa é permitido.',
          );
        }
      }
      if (targetRole.isPlatformRole && targetRole.name !== 'admin') {
        throw new BadRequestException(
          'Não é possível atribuir roles de plataforma (não-admin) a usuários de tenant.',
        );
      }
      if (targetRole.name === 'superadmin') {
        throw new BadRequestException(
          'Não é possível criar usuários "superadmin" para um tenant.',
        );
      }
    } else {
      if (!targetRole.isPlatformRole) {
        throw new BadRequestException(
          'Para usuários de plataforma, a role deve ser de plataforma (ex: admin, superadmin).',
        );
      }
      if (targetRole.name !== 'admin' && targetRole.name !== 'superadmin') {
        throw new BadRequestException(
          'Roles de plataforma válidas para esta rota são "admin" ou "superadmin".',
        );
      }
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: data.email,
        tenantId: targetTenantId ? targetTenantId : null,
      },
    });
    if (existingUser) {
      throw new BadRequestException(
        `Já existe um usuário com este email para ${targetTenantId ? 'o tenant especificado' : 'a plataforma'}.`,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        tenantId: targetTenantId,
        roleId: roleId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllUsersPlatform(
    requestingUserId: string,
    tenantIdFilter?: string,
    includeInactive: boolean = false,
    searchTerm?: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem listar todos os usuários.',
      );
    }

    const whereClause: any = {};
    if (tenantIdFilter) {
      whereClause.tenantId = tenantIdFilter;
    }
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true, isPlatformRole: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneUserPlatform(id: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem ver detalhes de usuários.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true, isPlatformRole: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { name: true } },
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
    }
    return user;
  }

  async updateUserPlatform(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem atualizar usuários da plataforma.',
      );
    }

    const userToUpdate = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!userToUpdate) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
    }

    if (requestingUserId === id && updateUserDto.isActive === false) {
      throw new BadRequestException(
        'Superadministradores não podem se inativar.',
      );
    }
    if (requestingUserId === id && updateUserDto.roleId) {
      const targetRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });
      if (targetRole && targetRole.name !== 'superadmin') {
        throw new BadRequestException(
          'Superadministradores não podem rebaixar a própria role.',
        );
      }
    }

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    let targetRole: { name: string; isPlatformRole: boolean } | null = null;

    if (updateUserDto.roleId) {
      targetRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
        select: { name: true, isPlatformRole: true },
      });
      if (!targetRole) {
        throw new BadRequestException(
          'Role especificada para atualização não existe.',
        );
      }

      if (userToUpdate.tenantId && targetRole.name === 'admin') {
        const existingAdminInTenant = await this.prisma.user.findFirst({
          where: {
            tenantId: userToUpdate.tenantId,
            role: { name: 'admin' },
            isActive: true,
            id: { not: id },
          },
        });
        if (existingAdminInTenant) {
          throw new BadRequestException(
            'Já existe outro administrador ativo para esta empresa. Somente um administrador por empresa é permitido.',
          );
        }
      }

      if (
        userToUpdate.tenantId &&
        targetRole.isPlatformRole &&
        targetRole.name !== 'admin'
      ) {
        throw new BadRequestException(
          'Não é possível atribuir uma role de plataforma (não-admin) a um usuário de tenant.',
        );
      }
      if (!userToUpdate.tenantId && !targetRole.isPlatformRole) {
        throw new BadRequestException(
          'Não é possível atribuir uma role de tenant a um usuário de plataforma.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async inactivateUserPlatform(id: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem inativar usuários da plataforma.',
      );
    }

    const userToInactivate = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!userToInactivate) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
    }

    if (requestingUserId === id) {
      throw new BadRequestException(
        'Superadministradores não podem se inativar.',
      );
    }

    if (
      userToInactivate.role.name === 'superadmin' &&
      userToInactivate.isActive
    ) {
      const activeSuperadmins = await this.prisma.user.count({
        where: {
          role: { name: 'superadmin' },
          isActive: true,
          id: { not: id },
        },
      });
      if (activeSuperadmins < 1) {
        throw new BadRequestException(
          'Não é possível inativar o único superadministrador ativo da plataforma.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: { select: { name: true } },
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
