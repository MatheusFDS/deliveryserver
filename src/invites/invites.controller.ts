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
import { DriversService } from 'src/drivers/drivers.service';

interface AcceptInviteDto {
  firebaseUid?: string;
  name: string;
  email: string;
  password?: string;
  cpf?: string;
  license?: string;
}

@Controller('invites')
export class InvitesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driversService: DriversService,
  ) {}

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

    if (!invite || !invite.role || !invite.tenantId) {
      throw new NotFoundException('Convite inválido ou corrompido.');
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

    let createdUser;

    if (invite.role.name === 'driver') {
      createdUser = await this.driversService.createFromInvite(
        {
          name: acceptDto.name,
          email: acceptDto.email,
          password: acceptDto.password,
          cpf: acceptDto.cpf,
          license: acceptDto.license,
        },
        {
          tenantId: invite.tenantId,
          roleId: invite.roleId,
        },
      );
    } else {
      // Lógica original para usuários não-motoristas
      if (!acceptDto.password || acceptDto.password.length < 6) {
        throw new BadRequestException(
          'A senha deve ter no mínimo 6 caracteres.',
        );
      }
      const hashedPassword = await bcrypt.hash(acceptDto.password, 10);
      createdUser = await this.prisma.user.create({
        data: {
          email: acceptDto.email,
          name: acceptDto.name,
          password: hashedPassword,
          tenantId: invite.tenantId,
          roleId: invite.roleId,
          isActive: true,
        },
      });
    }

    await this.prisma.userInvite.update({
      where: { id: token },
      data: { status: InviteStatus.ACCEPTED },
    });

    return {
      message: 'Convite aceito com sucesso!',
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
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
