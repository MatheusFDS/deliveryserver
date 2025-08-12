import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../shared/services/email.service';
import { InviteStatus, Prisma } from '@prisma/client';
import { addDays } from 'date-fns';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: {
        id: true,
        name: true,
        role: { select: { name: true, isPlatformRole: true } },
        tenantId: true,
        tenant: { select: { name: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário solicitante não encontrado.');
    }
    return user;
  }

  async findPendingInvites(
    requestingUserId: string,
    tenantIdFilter?: string,
    search?: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const where: Prisma.UserInviteWhereInput = {
      status: InviteStatus.PENDING,
    };

    // Verificar permissões
    if (requestingUser.role.name === 'superadmin') {
      // Superadmin pode ver todos os convites
      if (tenantIdFilter) {
        where.tenantId = tenantIdFilter;
      }
    } else if (requestingUser.role.name === 'admin') {
      // Admin só pode ver convites do seu tenant
      where.tenantId = requestingUser.tenantId;
    } else {
      throw new ForbiddenException(
        'Usuário não tem permissão para visualizar convites.',
      );
    }

    if (search) {
      where.email = {
        contains: search,
        mode: 'insensitive',
      };
    }

    try {
      const [invites, total] = await this.prisma.$transaction([
        this.prisma.userInvite.findMany({
          where,
          skip,
          take,
          include: {
            role: { select: { name: true, isPlatformRole: true } },
            tenant: { select: { name: true } },
            inviter: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.userInvite.count({ where }),
      ]);

      return {
        data: invites,
        total,
        page,
        pageSize,
        lastPage: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new Error('Erro ao buscar convites pendentes.');
    }
  }

  async resendInvite(inviteId: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    const invite = await this.prisma.userInvite.findUnique({
      where: { id: inviteId },
      include: {
        role: true,
        tenant: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }

    // Verificar permissões
    if (
      requestingUser.role.name !== 'superadmin' &&
      invite.tenantId !== requestingUser.tenantId
    ) {
      throw new ForbiddenException(
        'Usuário não tem permissão para reenviar este convite.',
      );
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Não é possível reenviar convite com status ${invite.status}.`,
      );
    }

    // Atualizar data de expiração
    const newExpiresAt = addDays(new Date(), 7);
    await this.prisma.userInvite.update({
      where: { id: inviteId },
      data: { expiresAt: newExpiresAt },
    });

    // Reenviar email
    try {
      await this.emailService.sendInviteEmail({
        email: invite.email,
        inviterName: requestingUser.name,
        roleName: invite.role.name,
        tenantName: invite.tenant?.name,
        inviteToken: invite.id,
        expiresAt: newExpiresAt,
      });

      return {
        message: 'Convite reenviado com sucesso!',
        expiresAt: newExpiresAt,
      };
    } catch (emailError) {
      return {
        message: 'Convite atualizado, mas houve erro no envio do email.',
        expiresAt: newExpiresAt,
        emailError: true,
      };
    }
  }

  async cancelInvite(inviteId: string, requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    const invite = await this.prisma.userInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }

    // Verificar permissões
    if (
      requestingUser.role.name !== 'superadmin' &&
      invite.tenantId !== requestingUser.tenantId
    ) {
      throw new ForbiddenException(
        'Usuário não tem permissão para cancelar este convite.',
      );
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Não é possível cancelar convite com status ${invite.status}.`,
      );
    }

    await this.prisma.userInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.CANCELLED },
    });

    return {
      message: 'Convite cancelado com sucesso.',
    };
  }

  async cleanupExpiredInvites(): Promise<number> {
    const expiredInvites = await this.prisma.userInvite.updateMany({
      where: {
        status: InviteStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: InviteStatus.EXPIRED,
      },
    });

    return expiredInvites.count;
  }

  async getInviteStats(requestingUserId: string) {
    const requestingUser =
      await this.getRequestingUserWithRoleAndTenant(requestingUserId);

    const where: Prisma.UserInviteWhereInput = {};

    // Aplicar filtro baseado na permissão
    if (requestingUser.role.name !== 'superadmin') {
      where.tenantId = requestingUser.tenantId;
    }

    const [pending, accepted, expired, cancelled] = await Promise.all([
      this.prisma.userInvite.count({
        where: { ...where, status: InviteStatus.PENDING },
      }),
      this.prisma.userInvite.count({
        where: { ...where, status: InviteStatus.ACCEPTED },
      }),
      this.prisma.userInvite.count({
        where: { ...where, status: InviteStatus.EXPIRED },
      }),
      this.prisma.userInvite.count({
        where: { ...where, status: InviteStatus.CANCELLED },
      }),
    ]);

    return {
      pending,
      accepted,
      expired,
      cancelled,
      total: pending + accepted + expired + cancelled,
    };
  }
}
