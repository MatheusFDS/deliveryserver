import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { EmailService } from '../shared/services/email.service';
import * as bcrypt from 'bcrypt';
import { Prisma, InviteStatus } from '@prisma/client';
import { addDays } from 'date-fns';
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from '../infrastructure/auth/auth.provider.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
  ) {}

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
    name: string;
    role: { name: string; isPlatformRole: boolean };
    tenantId: string | null;
    tenant?: { name: string } | null;
    firebaseUid: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: {
        id: true,
        name: true,
        role: { select: { name: true, isPlatformRole: true } },
        tenantId: true,
        tenant: { select: { name: true } },
        firebaseUid: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário solicitante não encontrado.');
    }
    return user;
  }

  /**
   * Versão corrigida do método forgotPassword
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    const successMessage =
      'Se um usuário com este e-mail estiver registrado, um link para redefinição de senha será enviado.';

    // A verificação do usuário é feita antes para evitar chamar o provedor desnecessariamente.
    // E por segurança, sempre retornamos a mesma mensagem.
    if (user) {
      try {
        // 1. Gera o link de redefinição através do provedor de autenticação.
        const resetLink =
          await this.authProvider.generatePasswordResetLink(email);

        // 2. Usa o serviço de e-mail para enviar o link gerado.
        // (Assumindo que o método sendPasswordResetEmail existe no seu EmailService)
        await this.emailService.sendPasswordResetEmail({
          email: user.email,
          name: user.name,
          resetLink: resetLink,
        });
      } catch (error) {
        // Em caso de erro (ex: falha no envio do e-mail),
        // registramos o erro internamente mas não o expomos ao cliente
        // para não vazar informações sobre o estado do sistema.
        console.error('Falha no processo de redefinição de senha:', error);
      }
    }

    return { message: successMessage };
  }

  async inviteUserForTenant(
    inviteUserDto: InviteUserDto,
    requestingUserId: string,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    const tenantId = requestingUser.tenantId;

    if (!tenantId) {
      throw new ForbiddenException(
        'Administrador não associado a um tenant para convidar usuários.',
      );
    }

    const { email, roleId } = inviteUserDto;

    const emailAlreadyExistsInUsers = await this.prisma.user.findUnique({
      where: { email },
    });
    if (emailAlreadyExistsInUsers) {
      throw new ConflictException(
        'Um usuário com este e-mail já existe na plataforma. Se for a mesma pessoa, ela não pode ser convidada novamente.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });
    if (existingUser) {
      throw new ConflictException(
        'Um usuário com este e-mail já existe nesta empresa.',
      );
    }

    const existingInvite = await this.prisma.userInvite.findFirst({
      where: { email, tenantId, status: InviteStatus.PENDING },
    });
    if (existingInvite) {
      throw new ConflictException(
        'Já existe um convite pendente para este e-mail nesta empresa.',
      );
    }

    const targetRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!targetRole || targetRole.isPlatformRole) {
      throw new BadRequestException(
        'Perfil inválido ou não permitido para tenants.',
      );
    }

    try {
      const expiresAt = addDays(new Date(), 7);
      const invite = await this.prisma.userInvite.create({
        data: {
          email,
          roleId,
          tenantId,
          invitedBy: requestingUserId,
          status: InviteStatus.PENDING,
          expiresAt,
        },
        include: {
          role: true,
          tenant: true,
        },
      });

      try {
        await this.emailService.sendInviteEmail({
          email,
          inviterName: requestingUser.name,
          roleName: targetRole.name,
          tenantName: requestingUser.tenant?.name,
          inviteToken: invite.id,
          expiresAt,
        });
      } catch (emailError) {
        return {
          message: 'Convite criado, mas houve erro no envio do email.',
          invite,
          emailError: true,
        };
      }

      return {
        message: 'Convite enviado com sucesso!',
        invite,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao criar o convite.',
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
      role: { isPlatformRole: false },
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
    // Proibido alterar e-mail
    if (updateUserDto.email) {
      throw new BadRequestException('Não é permitido alterar o e-mail.');
    }

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

    if (updateUserDto.name && updateUserDto.name !== userToUpdate.name) {
      const existingUserByName = await this.prisma.user.findFirst({
        where: {
          name: { equals: updateUserDto.name, mode: 'insensitive' },
          tenantId: requestingUserTenantId,
          id: { not: id },
        },
      });
      if (existingUserByName) {
        throw new ConflictException(
          `Já existe um usuário com o nome "${updateUserDto.name}" na sua empresa.`,
        );
      }
    }

    const { password, ...updateData } = updateUserDto;

    try {
      // Atualiza no Firebase primeiro
      if (password) {
        await this.authProvider.updateUser(userToUpdate.firebaseUid, {
          password,
        });
      }
      if (typeof updateUserDto.isActive === 'boolean') {
        await this.authProvider.updateUser(userToUpdate.firebaseUid, {
          disabled: !updateUserDto.isActive,
        });
      }

      // Se sucesso no Firebase, atualiza no banco de dados local
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
        error.message,
      );
    }
  }

  // O método deleteUserForTenant que você aprovou na primeira etapa já está aqui
  // e será usado pelo controller.
  async deleteUserForTenant(
    id: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const requestingUserTenantId =
      await this.getTenantIdFromUserId(requestingUserId);

    const userToDelete = await this.prisma.user.findFirst({
      where: { id, tenantId: requestingUserTenantId },
    });

    if (!userToDelete) {
      throw new NotFoundException(
        'Usuário não encontrado ou não pertence à sua empresa.',
      );
    }

    if (userToDelete.id === requestingUserId) {
      throw new BadRequestException('Você não pode excluir sua própria conta.');
    }

    try {
      // Exclui do Firebase primeiro
      await this.authProvider.deleteUser(userToDelete.firebaseUid);

      // Se sucesso, exclui do banco de dados local
      await this.prisma.user.delete({ where: { id } });

      return { message: 'Usuário excluído com sucesso.' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao excluir o usuário.',
        (error as Error).message,
      );
    }
  }

  // --- MÉTODOS DE PLATAFORMA (SUPERADMIN) ---

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
    });
    if (!targetRole)
      throw new BadRequestException('Role especificada não existe.');

    if (targetTenantId) {
      const targetTenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
      });
      if (!targetTenant)
        throw new NotFoundException(
          `Tenant com ID ${targetTenantId} não encontrado.`,
        );
      if (targetRole.isPlatformRole)
        throw new BadRequestException(
          'Não é possível atribuir roles de plataforma a usuários de tenant.',
        );
    } else {
      if (!targetRole.isPlatformRole)
        throw new BadRequestException(
          'Para usuários de plataforma, a role deve ser de plataforma.',
        );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: data.email,
        tenantId: targetTenantId ? targetTenantId : null,
      },
    });
    if (existingUser) {
      throw new ConflictException(
        `Já existe um usuário com este email para ${
          targetTenantId ? 'o tenant especificado' : 'a plataforma'
        }.`,
      );
    }

    // Cria usuário no Firebase
    const firebaseUser = await this.authProvider.createUser({
      email: data.email,
      password: password,
      displayName: data.name,
    });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      // Cria usuário no banco de dados local com o UID do Firebase
      return this.prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
          tenantId: targetTenantId,
          roleId: roleId,
          isActive: true,
          firebaseUid: firebaseUser.uid,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: { select: { name: true } },
          tenantId: true,
          isActive: true,
        },
      });
    } catch (error) {
      // Se a criação no banco de dados falhar, remove o usuário do Firebase.
      await this.authProvider.deleteUser(firebaseUser.uid);
      throw new InternalServerErrorException(
        'Erro ao criar usuário no banco de dados local.',
      );
    }
  }

  async findAllUsersPlatform(
    requestingUserId: string,
    tenantIdFilter?: string,
    includeInactive: boolean = false,
    searchTerm?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);
    if (requestingUser.role.name !== 'superadmin') {
      throw new ForbiddenException(
        'Apenas superadministradores podem listar todos os usuários.',
      );
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const where: Prisma.UserWhereInput = {};

    if (tenantIdFilter) {
      where.tenantId = tenantIdFilter;
    }
    if (!includeInactive) {
      where.isActive = true;
    }
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
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
            role: { select: { name: true, isPlatformRole: true, id: true } },
            roleId: true,
            tenantId: true,
            isActive: true,
            tenant: { select: { name: true } },
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
        'Erro inesperado ao buscar usuários da plataforma.',
      );
    }
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
    // Proibido alterar e-mail
    if (updateUserDto.email) {
      throw new BadRequestException('Não é permitido alterar o e-mail.');
    }

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
    if (!userToUpdate)
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);

    if (requestingUserId === id) {
      if (updateUserDto.isActive === false)
        throw new BadRequestException(
          'Superadministradores não podem se inativar.',
        );
      if (
        updateUserDto.roleId &&
        userToUpdate.roleId !== updateUserDto.roleId
      ) {
        throw new BadRequestException(
          'Superadministradores não podem alterar a própria role.',
        );
      }
    }

    const { password, ...updateData } = updateUserDto;

    try {
      // Atualiza no Firebase primeiro
      if (password) {
        await this.authProvider.updateUser(userToUpdate.firebaseUid, {
          password,
        });
      }
      if (typeof updateUserDto.isActive === 'boolean') {
        await this.authProvider.updateUser(userToUpdate.firebaseUid, {
          disabled: !updateUserDto.isActive,
        });
      }

      if (password) {
        (updateData as any).password = await bcrypt.hash(password, 10);
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
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao atualizar o usuário.',
        error.message,
      );
    }
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

    try {
      // Desabilita no Firebase
      await this.authProvider.updateUser(userToInactivate.firebaseUid, {
        disabled: true,
      });

      // Inativa no banco de dados local
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
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao inativar o usuário.',
        error.message,
      );
    }
  }
}
