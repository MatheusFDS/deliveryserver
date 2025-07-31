import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DeliveryController],
  providers: [DeliveryService, PrismaService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
