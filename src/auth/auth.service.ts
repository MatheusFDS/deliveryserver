import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

  async logout(firebaseUid: string): Promise<void> {
    try {
      await admin.auth().revokeRefreshTokens(firebaseUid);
    } catch (error) {
      // Error handling without console logs
    }
  }
}
