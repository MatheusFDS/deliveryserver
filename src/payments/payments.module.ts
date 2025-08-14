// src/payments/payments.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
import { DeliveryModule } from 'src/delivery/delivery.module'; // Importar DeliveryModule

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
    forwardRef(() => DeliveryModule), // Adicionar forwardRef para o DeliveryModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService], // Adicionar esta linha para exportar o serviço
})
export class PaymentsModule {}
