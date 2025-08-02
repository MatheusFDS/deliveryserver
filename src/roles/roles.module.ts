import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module'; // Adicionado
import { TenantModule } from 'src/tenant/tenant.module'; // Adicionado

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    PrismaModule,
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [RolesController],
  providers: [RolesService, PrismaService],
  exports: [RolesService],
})
export class RolesModule {}
