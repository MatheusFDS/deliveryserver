import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [UserSettingsService, PrismaService],
  controllers: [UserSettingsController],
})
export class UserSettingsModule {}
