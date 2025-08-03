// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
} from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter'; // Certifique-se de que o caminho está correto

const port = process.env.PORT || 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://deliveryweb-production.up.railway.app',
    'http://localhost:8080',
    'http://10.250.13.156:8080',
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin não autorizada pelo CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.enableCors(corsOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Ordem crucial para tratamento de exceções:
  // 1. PrismaExceptionFilter: Captura erros do Prisma primeiro para dar mensagens específicas.
  // 2. HttpExceptionFilter: Captura HttpExceptions (BadRequest, Conflict, NotFound, etc.) lançadas manualmente.
  // 3. AllExceptionsFilter: Captura qualquer outra exceção não tratada como um fallback genérico.
  app.useGlobalFilters(
    new PrismaExceptionFilter(), // Adicione ou mova este para ser o primeiro para erros específicos do DB
    new HttpExceptionFilter(),
    new AllExceptionsFilter(),
  );

  await app.listen(port, '0.0.0.0');
}

bootstrap();
