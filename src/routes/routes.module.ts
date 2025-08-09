// src/routes/routes.module.ts

// Justificativa: O módulo foi atualizado para registrar os novos componentes
// da nossa arquitetura de adaptadores. Ele agora declara explicitamente o
// GoogleMapsAdapter e utiliza o arquivo de provedores para configurar a
// injeção de dependência da nossa abstração.

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

// --- NOVAS IMPORTAÇÕES ---
import { GoogleMapsAdapter } from './adapters/google-maps.adapter';
import { routesProviders } from './providers/routes.providers';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    ConfigModule, // O ConfigModule é necessário para o GoogleMapsAdapter injetar o ConfigService
    forwardRef(() => UsersModule),
    forwardRef(() => TenantModule),
  ],
  controllers: [RoutesController],
  providers: [
    // 1. O serviço principal do módulo
    RoutesService,

    // 2. O PrismaService continua sendo uma dependência
    PrismaService,

    // 3. Declaramos nossa implementação concreta como um provedor para que o NestJS a conheça.
    GoogleMapsAdapter,

    // 4. Usamos o operador spread para adicionar nossa configuração de injeção de dependência
    // que conecta a interface (IMapsAdapter) à classe concreta (GoogleMapsAdapter).
    ...routesProviders,
  ],
})
export class RoutesModule {}
