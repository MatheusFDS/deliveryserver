// src/auth/auth.service.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca o usuário completo do banco de dados após a validação do token.
   * Este método é o ponto de entrada para estabelecer a sessão do usuário no sistema.
   * @param userId O ID interno do usuário (UUID), garantido como válido pelo Guard.
   * @returns O objeto de usuário completo do nosso banco de dados.
   */
  async getSessionUser(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        tenant: true,
        driver: { select: { id: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Usuário não encontrado no sistema após a validação.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Invalida todas as sessões de um usuário no Firebase.
   * Uma medida de segurança que pode ser chamada pelo backend.
   */
  async logout(firebaseUid: string): Promise<void> {
    try {
      await admin.auth().revokeRefreshTokens(firebaseUid);
      this.logger.log(`Tokens de atualização revogados para: ${firebaseUid}`);
    } catch (error) {
      this.logger.error(
        `Falha ao revogar tokens para o usuário ${firebaseUid}`,
        error,
      );
    }
  }
}
