import { Module, forwardRef } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { DeliveryService } from '../delivery/delivery.service';
import { DriversService } from '../drivers/drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { MobileService } from './mobile.service';
import { UsersModule } from 'src/users/users.module'; // Adicionado
import { TenantModule } from 'src/tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [MobileController],
  providers: [MobileService, DeliveryService, DriversService, PrismaService],
})
export class MobileModule {}
