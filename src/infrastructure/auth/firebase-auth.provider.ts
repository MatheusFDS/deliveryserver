// src/infrastructure/auth/firebase-auth.provider.ts

import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { IAuthProvider, DecodedToken } from './auth.provider.interface';
import { User as PrismaUser, InviteStatus } from '@prisma/client';
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

  async findOrCreateUser(decodedToken: DecodedToken): Promise<PrismaUser> {
    // 1. Verifica se o usuário já existe pelo firebaseUid
    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (existingUser) {
      return existingUser;
    }

    // 2. Se não existe, verifica se há um convite PENDENTE para o e-mail do token
    const invite = await this.prisma.userInvite.findFirst({
      where: {
        email: decodedToken.email,
        status: InviteStatus.PENDING,
        // Opcional: verificar se o convite não expirou
        // expiresAt: { gte: new Date() },
      },
    });

    // 3. Se NÃO HÁ convite, rejeita o acesso
    if (!invite) {
      throw new ForbiddenException(
        'Você não possui um convite válido para acessar esta plataforma.',
      );
    }

    // 4. Se HÁ um convite, cria o usuário e atualiza o convite (em uma transação)
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
        });

        await tx.userInvite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.ACCEPTED },
        });

        return createdUser;
      });
      return newUser;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao criar usuário a partir do convite.',
      );
    }
  }
}
