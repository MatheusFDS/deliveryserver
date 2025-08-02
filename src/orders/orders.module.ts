import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module'; // Adicionado
import { TenantModule } from '../tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
})
export class OrdersModule {}
