// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule], // Adicione PrismaModule se PrismaService não for global
  controllers: [UsersController],
  providers: [UsersService, PrismaService], // PrismaService aqui ou importando PrismaModule que o exporta
  exports: [UsersService], // <-- ADICIONADO UsersService aos exports
})
export class UsersModule {}
