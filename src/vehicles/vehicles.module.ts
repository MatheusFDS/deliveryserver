import { Module, forwardRef } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from 'src/users/users.module'; // Adicionado
import { TenantModule } from 'src/tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, PrismaService],
})
export class VehiclesModule {}
