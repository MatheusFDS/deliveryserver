import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface AcceptInviteDto {
  firebaseUid: string;
  name: string;
  email: string;
  password?: string; // 👈 Adicionar campo opcional para senha
}

@Controller('invites')
export class InvitesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':token')
  async getInviteDetails(@Param('token', ParseUUIDPipe) token: string) {
    const invite = await this.prisma.userInvite.findUnique({
      where: { id: token },
      include: {
        role: { select: { name: true, isPlatformRole: true } },
        tenant: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Convite já foi ${invite.status.toLowerCase()}.`,
      );
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.userInvite.update({
        where: { id: token },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Convite expirado.');
    }

    // Verificar se já existe usuário com este email
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: invite.email,
        tenantId: invite.tenantId,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Já existe um usuário com este email nesta empresa.',
      );
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      tenant: invite.tenant,
      inviter: invite.inviter,
      expiresAt: invite.expiresAt,
    };
  }

  @Post(':token/accept')
  async acceptInvite(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() acceptDto: AcceptInviteDto,
  ) {
    const invite = await this.prisma.userInvite.findUnique({
      where: { id: token },
      include: {
        role: true,
        tenant: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Convite já foi ${invite.status.toLowerCase()}.`,
      );
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.userInvite.update({
        where: { id: token },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Convite expirado.');
    }

    if (invite.email !== acceptDto.email) {
      throw new BadRequestException('Email não corresponde ao convite.');
    }

    // Verificar se já existe usuário com este firebaseUid (se fornecido)
    if (acceptDto.firebaseUid) {
      const existingUserByUid = await this.prisma.user.findUnique({
        where: { firebaseUid: acceptDto.firebaseUid },
      });

      if (existingUserByUid) {
        throw new BadRequestException(
          'Esta conta já está associada a outro usuário.',
        );
      }
    }

    // Verificar se já existe usuário com este email no tenant
    const existingUserByEmail = await this.prisma.user.findFirst({
      where: {
        email: acceptDto.email,
        tenantId: invite.tenantId,
      },
    });

    if (existingUserByEmail) {
      throw new BadRequestException(
        'Já existe um usuário com este email nesta empresa.',
      );
    }

    // Validar senha se fornecida
    if (acceptDto.password && acceptDto.password.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres.');
    }

    // Criar usuário e marcar convite como aceito
    const user = await this.prisma.$transaction(async (tx) => {
      // Preparar dados do usuário
      const userData: any = {
        email: acceptDto.email,
        name: acceptDto.name,
        tenantId: invite.tenantId,
        roleId: invite.roleId,
        isActive: true,
      };

      // Adicionar firebaseUid se fornecido (pode ser null)
      if (acceptDto.firebaseUid) {
        userData.firebaseUid = acceptDto.firebaseUid;
      }

      // Adicionar senha hasheada se fornecida
      if (acceptDto.password) {
        userData.password = await bcrypt.hash(acceptDto.password, 10);
      }

      const createdUser = await tx.user.create({
        data: userData,
        include: {
          role: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      });

      await tx.userInvite.update({
        where: { id: token },
        data: { status: InviteStatus.ACCEPTED },
      });

      return createdUser;
    });

    return {
      message: 'Convite aceito com sucesso!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant,
      },
    };
  }

  @Post(':token/cancel')
  async cancelInvite(@Param('token', ParseUUIDPipe) token: string) {
    const invite = await this.prisma.userInvite.findUnique({
      where: { id: token },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Convite já foi ${invite.status.toLowerCase()}.`,
      );
    }

    await this.prisma.userInvite.update({
      where: { id: token },
      data: { status: InviteStatus.CANCELLED },
    });

    return {
      message: 'Convite cancelado com sucesso.',
    };
  }
}
