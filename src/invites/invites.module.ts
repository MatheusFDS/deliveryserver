import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesManagementController } from './invites-management.controller';
import { InvitesService } from './invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../shared/services/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InvitesController, InvitesManagementController],
  providers: [InvitesService, PrismaService, EmailService],
  exports: [InvitesService],
})
export class InvitesModule {}
