import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
})
export class PaymentsModule {}
