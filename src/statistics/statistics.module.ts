import { Module, forwardRef } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module'; // Importar UsersModule
import { TenantModule } from 'src/tenant/tenant.module'; // Importar TenantModule

@Module({
  imports: [
    forwardRef(() => AuthModule), // Manter forwardRef se AuthModule for importado ciclicamente
    forwardRef(() => UsersModule), // Adicionar UsersModule
    forwardRef(() => TenantModule), // Adicionar TenantModule
  ],
  providers: [StatisticsService, PrismaService],
  controllers: [StatisticsController],
})
export class StatisticsModule {}
