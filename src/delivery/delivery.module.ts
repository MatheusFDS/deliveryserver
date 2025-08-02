import { Module, forwardRef } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module'; // Adicionado
import { TenantModule } from 'src/tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, PrismaService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
