import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [RoutesController],
  providers: [RoutesService, PrismaService],
})
export class RoutesModule {}
