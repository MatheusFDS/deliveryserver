// src/auth/auth.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AUTH_PROVIDER } from '../infrastructure/auth/auth.provider.interface';
import { FirebaseAuthProvider } from '../infrastructure/auth/firebase-auth.provider';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    FirebaseAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useClass: FirebaseAuthProvider,
    },
  ],
  exports: [AuthService, JwtAuthGuard, AUTH_PROVIDER],
})
export class AuthModule {}
