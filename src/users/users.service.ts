import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

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

  // ==============================================================
  // OPERAÇÕES DE USUÁRIO - NÍVEL DE TENANT (Admin do Tenant)
  // ==============================================================

  async createUserForTenant(
    createUserDto: CreateUserDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    const requestingUserTenantId = requestingUser.tenantId;

    if (!requestingUserTenantId) {
      throw new ForbiddenException(
        'Administrador não associado a um tenant para criar usuário.',
      );
    }

    const { password, roleId, ...data } = createUserDto;

    const targetRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!targetRole) {
      throw new BadRequestException('Perfil especificado não existe.');
    }
    if (targetRole.isPlatformRole) {
      throw new ForbiddenException(
        'Você não pode criar usuários com perfis de plataforma.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email, tenantId: requestingUserTenantId },
    });
    if (existingUser) {
      throw new ConflictException(
        'Já existe um usuário com este email na sua empresa.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
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
          isActive: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao criar o usuário.',
      );
    }
  }

  async findAllByTenant(
    requestingUserId: string,
    search?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const tenantId = await this.getTenantIdFromUserId(requestingUserId);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.UserWhereInput = {
      tenantId,
      role: { isPlatformRole: false }, // Admins de tenant só veem usuários de tenant
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            email: true,
            name: true,
            role: { select: { id: true, name: true } },
            roleId: true,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        data: users,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar usuários.',
      );
    }
  }

  async findAllByTenantList(requestingUserId: string) {
    const tenantId = await this.getTenantIdFromUserId(requestingUserId);
    try {
      return await this.prisma.user.findMany({
        where: { tenantId, role: { isPlatformRole: false } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar a lista de usuários.',
      );
    }
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
        isActive: true,
      },
    });
    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado ou não pertence à sua empresa.',
      );
    }
    return user;
  }

  async updateUserForTenant(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId: string,
  ) {
    const requestingUserTenantId =
      await this.getTenantIdFromUserId(requestingUserId);

    const userToUpdate = await this.prisma.user.findFirst({
      where: { id, tenantId: requestingUserTenantId },
      include: { role: true },
    });
    if (!userToUpdate) {
      throw new NotFoundException(
        'Usuário não encontrado ou não pertence à sua empresa.',
      );
    }

    // Admin não pode editar a si mesmo para se inativar ou mudar o próprio perfil
    if (id === requestingUserId) {
      if (updateUserDto.isActive === false) {
        throw new BadRequestException('Administradores não podem se inativar.');
      }
      if (
        updateUserDto.roleId &&
        updateUserDto.roleId !== userToUpdate.roleId
      ) {
        throw new BadRequestException(
          'Administradores não podem alterar o próprio perfil.',
        );
      }
    }

    const { password, ...updateData } = updateUserDto;

    if (password) {
      (updateData as any).password = await bcrypt.hash(password, 10);
    }

    if (updateUserDto.roleId) {
      const targetRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });
      if (!targetRole || targetRole.isPlatformRole) {
        throw new BadRequestException('Perfil inválido ou não permitido.');
      }
    }

    try {
      return this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
          isActive: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar o usuário.',
      );
    }
  }

  // MÉTODOS DE SUPERADMIN (NÃO ALTERADOS) PERMANECEM ABAIXO...
  // ... findOneById, createPlatformUser, findAllUsersPlatform, etc ...

  // Manter os métodos que não foram alterados
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
}
