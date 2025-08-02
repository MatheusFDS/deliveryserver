import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module'; // Adicionado
import { TenantModule } from 'src/tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  providers: [UserSettingsService, PrismaService],
  controllers: [UserSettingsController],
})
export class UserSettingsModule {}
