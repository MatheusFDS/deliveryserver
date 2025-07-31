import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { DeliveryService } from '../delivery/delivery.service';
import { DriversService } from '../drivers/drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { MobileService } from './mobile.service';

@Module({
  imports: [AuthModule],
  controllers: [MobileController],
  providers: [MobileService, DeliveryService, DriversService, PrismaService],
})
export class MobileModule {}
