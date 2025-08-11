import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';

const port = process.env.PORT || 4000;

class CustomIoAdapter extends IoAdapter {
  private allowedOrigins: string[];

  constructor(app: INestApplicationContext, allowedOrigins: string[]) {
    super(app);
    this.allowedOrigins = allowedOrigins;
  }

  createIOServer(port: number, options?: any) {
    const corsOptions = {
      origin: this.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    };

    const opts = {
      ...options,
      cors: corsOptions,
    };

    return super.createIOServer(port, opts);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://deliveryweb-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://10.250.13.156:8080',
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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

  app.useWebSocketAdapter(new CustomIoAdapter(app, allowedOrigins));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AppExceptionFilter());

  await app.listen(port, '0.0.0.0');
}

bootstrap();
