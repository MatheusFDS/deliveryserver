import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserSettingsService {
  constructor(private prisma: PrismaService) {}

  async getUserSettings(userId: string) {
    // A busca por userId garante que o usuário só acessa suas próprias configurações.
    return this.prisma.userSettings.findUnique({
      where: {
        userId: userId,
      },
    });
  }

  async updateUserSettings(userId: string, settings: any) {
    // O upsert por userId garante que as configurações são atualizadas/criadas apenas para o usuário logado.
    return this.prisma.userSettings.upsert({
      where: {
        userId: userId,
      },
      update: {
        settings: settings,
      },
      create: {
        userId: userId,
        settings: settings,
      },
    });
  }
}
