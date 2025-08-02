import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { UsersModule } from 'src/users/users.module'; // Adicionado
import { TenantModule } from 'src/tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    ConfigModule,
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [RoutesController],
  providers: [RoutesService, PrismaService],
})
export class RoutesModule {}
