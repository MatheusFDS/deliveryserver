import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const port = process.env.PORT || 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://deliveryweb-ten.vercel.app',
    'http://localhost:3000',
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Permite requisições sem origem (ex: Postman)
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
}

bootstrap();
