import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { HttpExceptionFilter } from './common/filters/http-exception.filter'; // Importe o filtro

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
        console.warn(`🚨 CORS bloqueado para: ${origin}`);
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

  // Registra o filtro de exceções globalmente
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
}

bootstrap();
