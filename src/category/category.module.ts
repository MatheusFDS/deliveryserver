import { Module, forwardRef } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from '../users/users.module'; // Adicionado
import { TenantModule } from '../tenant/tenant.module'; // Adicionadoo

@Module({
  imports: [
    forwardRef(() => AuthModule), // Adicionado forwardRef
    forwardRef(() => UsersModule), // Adicionado
    forwardRef(() => TenantModule), // Adicionado
  ],
  controllers: [CategoryController],
  providers: [CategoryService, PrismaService],
})
export class CategoryModule {}
