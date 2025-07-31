import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto'; // Adicionado import

@Injectable()
export class RolesService {
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
  // OPERAÇÕES DE ROLE - NÍVEL DE TENANT (Admin do Tenant)
  // ==============================================================
  async findAll() {
    return this.prisma.role.findMany({
      where: { isPlatformRole: false },
    });
  }

  // ==============================================================
  // OPERAÇÕES DE ROLE - NÍVEL DE PLATAFORMA (Superadmin)
  // ==============================================================

  async createRoleForPlatform(
    createRoleDto: CreateRoleDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem criar roles de plataforma.',
      );
    }

    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new BadRequestException(
        `Role com nome '${createRoleDto.name}' já existe.`,
      );
    }

    return this.prisma.role.create({
      data: createRoleDto,
    });
  }

  async findAllForPlatformAdmin(requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem listar todas as roles.',
      );
    }
    return this.prisma.role.findMany();
  }

  async findRoleByIdForPlatformAdmin(roleId: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem ver detalhes de roles.',
      );
    }
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
    }
    return role;
  }

  async updateRoleForPlatformAdmin(
    roleId: string,
    updateRoleDto: UpdateRoleDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem atualizar roles de plataforma.',
      );
    }

    const roleExists = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!roleExists) {
      throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
    }

    // Regra: Superadmin não pode alterar nome de role de plataforma para um que já existe
    if (updateRoleDto.name && updateRoleDto.name !== roleExists.name) {
      const anotherRoleWithSameName = await this.prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });
      if (anotherRoleWithSameName) {
        throw new BadRequestException(
          `Outra role com nome '${updateRoleDto.name}' já existe.`,
        );
      }
    }

    try {
      return await this.prisma.role.update({
        where: { id: roleId },
        data: updateRoleDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
      }
      throw new BadRequestException('Erro ao atualizar a role.');
    }
  }

  async deleteRoleForPlatformAdmin(roleId: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRole(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem deletar roles de plataforma.',
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { users: true },
    });

    if (!role) {
      throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
    }

    if (role.users && role.users.length > 0) {
      throw new BadRequestException(
        `Role com ID ${roleId} não pode ser deletada pois está associada a ${role.users.length} usuário(s).`,
      );
    }

    // Regra: Não pode deletar roles essenciais (superadmin, admin, user, driver)
    const essentialRoles = ['superadmin', 'admin', 'user', 'driver'];
    if (essentialRoles.includes(role.name)) {
      throw new ForbiddenException(
        `Não é possível deletar a role '${role.name}' pois é uma role essencial do sistema.`,
      );
    }

    try {
      return await this.prisma.role.delete({
        where: { id: roleId },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
      }
      throw new BadRequestException('Erro ao deletar a role.');
    }
  }
}
