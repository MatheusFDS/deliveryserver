import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DriversService } from '../drivers/drivers.service';
import {
  IAuthProvider,
  AUTH_PROVIDER,
} from '../infrastructure/auth/auth.provider.interface';

interface AcceptInviteDto {
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
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
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
      include: { role: true },
    });

    if (!invite || !invite.role || !invite.tenantId) {
      throw new NotFoundException('Convite inválido.');
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

    if (!acceptDto.password || acceptDto.password.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres.');
    }

    const firebaseUser = await this.authProvider.createUser({
      email: acceptDto.email,
      password: acceptDto.password,
      displayName: acceptDto.name,
    });

    let createdUser;
    try {
      const hashedPassword = await bcrypt.hash(acceptDto.password, 10);

      if (invite.role.name === 'driver') {
        if (!acceptDto.cpf || !acceptDto.license) {
          throw new BadRequestException(
            'CPF e CNH são obrigatórios para motoristas.',
          );
        }
        createdUser = await this.driversService.createFromInvite(
          {
            ...acceptDto,
            firebaseUid: firebaseUser.uid,
            password: hashedPassword,
          },
          { tenantId: invite.tenantId, roleId: invite.roleId },
        );
      } else {
        createdUser = await this.prisma.user.create({
          data: {
            email: acceptDto.email,
            name: acceptDto.name,
            password: hashedPassword,
            tenantId: invite.tenantId,
            roleId: invite.roleId,
            firebaseUid: firebaseUser.uid,
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
    } catch (dbError) {
      await this.authProvider.deleteUser(firebaseUser.uid);
      throw dbError;
    }
  }
}
