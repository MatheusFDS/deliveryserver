import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
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
  private readonly logger = new Logger(FirebaseAuthProvider.name);

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
      this.logger.debug('Validando token Firebase...');
      const decodedFirebaseToken = await admin
        .auth()
        .verifyIdToken(token, true);

      const decoded = {
        uid: decodedFirebaseToken.uid,
        email: decodedFirebaseToken.email,
        name: decodedFirebaseToken.name,
        picture: decodedFirebaseToken.picture,
      };

      this.logger.debug(`Token válido para: ${decoded.email}`);
      return decoded;
    } catch (error) {
      this.logger.error(`Erro ao validar token: ${error.message}`);
      throw new UnauthorizedException(
        'Token do Firebase inválido ou expirado.',
      );
    }
  }

  async findOrCreateUser(decodedToken: DecodedToken): Promise<UserWithRole> {
    this.logger.debug(`Buscando usuário com firebaseUid: ${decodedToken.uid}`);

    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        role: true,
      },
    });

    if (existingUser) {
      this.logger.debug(
        `Usuário existente encontrado: ${existingUser.email}, Role: ${existingUser.role.name}`,
      );
      return existingUser as UserWithRole;
    }

    this.logger.debug(
      `Usuário não existe, verificando convites para: ${decodedToken.email}`,
    );

    const invite = await this.prisma.userInvite.findFirst({
      where: {
        email: decodedToken.email,
        status: InviteStatus.PENDING,
      },
    });

    if (!invite) {
      this.logger.warn(`Nenhum convite encontrado para: ${decodedToken.email}`);
      throw new ForbiddenException(
        'Você não possui um convite válido para acessar esta plataforma.',
      );
    }

    this.logger.debug(
      `Convite encontrado, criando usuário para: ${decodedToken.email}`,
    );

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

      this.logger.debug(
        `Usuário criado: ${newUser.email}, Role: ${newUser.role.name}`,
      );
      return newUser as UserWithRole;
    } catch (error) {
      this.logger.error(`Erro ao criar usuário: ${error.message}`);
      throw new InternalServerErrorException(
        'Erro ao criar usuário a partir do convite.',
      );
    }
  }

  async getUserWithRoleDetails(userId: string): Promise<UserWithRole> {
    this.logger.debug(`Buscando detalhes do usuário: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      this.logger.warn(`Usuário não encontrado: ${userId}`);
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    this.logger.debug(
      `Usuário encontrado: ${user.email}, Role: ${user.role.name}`,
    );
    return user as UserWithRole;
  }
}
