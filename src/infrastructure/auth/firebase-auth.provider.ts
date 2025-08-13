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

      const decoded = {
        uid: decodedFirebaseToken.uid,
        email: decodedFirebaseToken.email,
        name: decodedFirebaseToken.name,
        picture: decodedFirebaseToken.picture,
      };

      return decoded;
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

  // --- NOVOS MÉTODOS ---

  async createUser(data: {
    email: string;
    password?: string;
    displayName?: string;
  }): Promise<{ uid: string }> {
    try {
      const userRecord = await admin.auth().createUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        emailVerified: false, // Opcional: pode ser true se você tiver um fluxo de verificação
      });
      return { uid: userRecord.uid };
    } catch (error) {
      // O NestJS lida com a remoção do 'error.message' em produção.
      throw new InternalServerErrorException(
        'Erro ao criar usuário no Firebase.',
        error.message,
      );
    }
  }

  async updateUser(
    uid: string,
    data: { password?: string; disabled?: boolean; displayName?: string },
  ): Promise<void> {
    try {
      await admin.auth().updateUser(uid, data);
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao atualizar usuário no Firebase.',
        error.message,
      );
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao deletar usuário no Firebase.',
        error.message,
      );
    }
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      const link = await admin.auth().generatePasswordResetLink(email);
      return link;
    } catch (error) {
      // Firebase lança erro se o e-mail não existe.
      // A camada de serviço (UserService) deve tratar isso para não expor quais e-mails existem.
      throw new InternalServerErrorException(
        'Erro ao gerar o link de redefinição de senha.',
        error.message,
      );
    }
  }
}
