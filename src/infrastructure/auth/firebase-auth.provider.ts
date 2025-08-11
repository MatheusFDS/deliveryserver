import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IAuthProvider,
  DecodedToken,
  UserWithRole,
} from './auth.provider.interface';
import { InviteStatus } from '@prisma/client';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthProvider implements IAuthProvider, OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const serviceAccountCredentials = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_CREDENTIALS',
    );
    if (!serviceAccountCredentials) {
      throw new Error(
        'Credenciais do Firebase Service Account não encontradas no .env',
      );
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(serviceAccountCredentials),
        ),
      });
    }
  }

  async validateToken(token: string): Promise<DecodedToken> {
    try {
      const decodedFirebaseToken = await admin
        .auth()
        .verifyIdToken(token, true);
      return {
        uid: decodedFirebaseToken.uid,
        email: decodedFirebaseToken.email,
        name: decodedFirebaseToken.name,
        picture: decodedFirebaseToken.picture,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'Token do Firebase inválido ou expirado.',
      );
    }
  }

  async findOrCreateUser(decodedToken: DecodedToken): Promise<UserWithRole> {
    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        role: true,
      },
    });

    if (existingUser) {
      return existingUser as UserWithRole;
    }

    const invite = await this.prisma.userInvite.findFirst({
      where: {
        email: decodedToken.email,
        status: InviteStatus.PENDING,
      },
    });

    if (!invite) {
      throw new ForbiddenException(
        'Você não possui um convite válido para acessar esta plataforma.',
      );
    }

    try {
      const newUser = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            firebaseUid: decodedToken.uid,
            email: decodedToken.email!,
            name: decodedToken.name || 'Usuário Convidado',
            tenantId: invite.tenantId,
            roleId: invite.roleId,
            isActive: true,
          },
          include: {
            role: true,
          },
        });

        await tx.userInvite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.ACCEPTED },
        });

        return createdUser;
      });
      return newUser as UserWithRole;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao criar usuário a partir do convite.',
      );
    }
  }

  async getUserWithRoleDetails(userId: string): Promise<UserWithRole> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return user as UserWithRole;
  }
}
