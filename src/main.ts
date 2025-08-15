import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, INestApplicationContext } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path'; // 1. Importar 'join'
import { NestExpressApplication } from '@nestjs/platform-express'; // 2. Importar o tipo

const port = process.env.PORT || 4000;

class CustomIoAdapter extends IoAdapter {
  private allowedOrigins: string[];

  constructor(app: INestApplicationContext, allowedOrigins: string[]) {
    super(app);
    this.allowedOrigins = allowedOrigins;
  }

  createIOServer(port: number, options?: any) {
    const corsOptions = {
      origin: (
        origin: string,
        callback: (error: Error | null, allow?: boolean) => void,
      ) => {
        if (
          !origin ||
          this.allowedOrigins.includes(origin) ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('192.168.') ||
          origin.includes('deliveryserver-production.up.railway.app')
        ) {
          return callback(null, true);
        }
        console.warn(`WebSocket CORS: Origin não autorizada: ${origin}`);
        return callback(new Error('Origin não autorizada pelo CORS'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    };

    const opts = { ...options, cors: corsOptions };
    return super.createIOServer(port, opts);
  }
}

async function bootstrap() {
  // 3. Tipar o 'app' para ter acesso ao 'useStaticAssets'
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = [
    'https://deliveryweb-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://10.250.13.156:8080',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) =>
      o.trim(),
    );
    allowedOrigins.push(...envOrigins);
  }

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (
        process.env.NODE_ENV !== 'production' &&
        (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ) {
        callback(null, true);
      } else {
        console.warn(`HTTP CORS: Origin não autorizada: ${origin}`);
        callback(new Error('Origin não autorizada pelo CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  };

  app.enableCors(corsOptions);

  app.useWebSocketAdapter(new CustomIoAdapter(app, allowedOrigins));

  // 4. Adicionar a linha para servir arquivos estáticos da pasta 'uploads'
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

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

bootstrap().catch((err) => {
  console.error('Erro ao inicializar aplicação:', err);
  process.exit(1);
});
