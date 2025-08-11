// src/infrastructure/auth/firebase-auth.provider.ts

import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { IAuthProvider, DecodedToken } from './auth.provider.interface';
import { User as PrismaUser } from '@prisma/client';
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
    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (existingUser) {
      return existingUser;
    }

    const userByEmail = await this.prisma.user.findUnique({
      where: { email: decodedToken.email },
    });

    if (userByEmail) {
      return this.prisma.user.update({
        where: { email: decodedToken.email },
        data: { firebaseUid: decodedToken.uid },
      });
    }

    const defaultRole = await this.prisma.role.findFirst({
      where: { name: 'user' }, // Ou um role 'pending_approval'
    });

    if (!defaultRole) {
      throw new InternalServerErrorException(
        "Role 'user' padrão não encontrada para criar novo usuário.",
      );
    }

    return this.prisma.user.create({
      data: {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email!,
        name: decodedToken.name || 'Usuário',
        roleId: defaultRole.id,
      },
    });
  }
}
