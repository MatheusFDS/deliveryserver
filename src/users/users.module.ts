// src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => TenantModule),
    PrismaModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
