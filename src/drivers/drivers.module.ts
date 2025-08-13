import { Module, forwardRef } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [DriversController],
  providers: [DriversService, PrismaService],
  exports: [DriversService], // Adicionar esta linha para exportar o serviço
})
export class DriversModule {}
