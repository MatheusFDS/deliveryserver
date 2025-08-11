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
      origin: (
        origin: string,
        callback: (error: Error | null, allow?: boolean) => void,
      ) => {
        // SEMPRE permite conexões sem origin (mobile apps, Postman, etc.)
        if (!origin) {
          console.log('WebSocket: Permitindo conexão sem origin (mobile/app)');
          return callback(null, true);
        }

        // Verifica se a origin está na lista permitida
        if (this.allowedOrigins.includes(origin)) {
          console.log('WebSocket: Origin autorizada:', origin);
          return callback(null, true);
        }

        // Permite localhost em qualquer porta para desenvolvimento
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('192.168.')
        ) {
          console.log('WebSocket: Permitindo localhost/LAN:', origin);
          return callback(null, true);
        }

        // IMPORTANTE: Para mobile apps, permite conexões do próprio servidor
        if (origin.includes('deliveryserver-production.up.railway.app')) {
          console.log(
            'WebSocket: Permitindo conexão do próprio servidor:',
            origin,
          );
          return callback(null, true);
        }

        console.warn(`WebSocket CORS: Origin não autorizada: ${origin}`);
        return callback(new Error('Origin não autorizada pelo CORS'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    };

    const opts = {
      ...options,
      cors: corsOptions,
      // Configurações adicionais para melhor estabilidade
      pingTimeout: 60000, // 1 minuto
      pingInterval: 25000, // 25 segundos
      upgradeTimeout: 30000, // 30 segundos para upgrade
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true, // Compatibilidade com versões anteriores
      transports: ['websocket', 'polling'],
    };

    console.log('Criando servidor Socket.IO com configurações:', {
      corsOrigins: this.allowedOrigins,
      pingTimeout: opts.pingTimeout,
      pingInterval: opts.pingInterval,
    });

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
    // Adiciona variações para desenvolvimento
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  // Adiciona origins do ambiente se disponível
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
      origin.trim(),
    );
    allowedOrigins.push(...envOrigins);
  }

  console.log('Origins permitidas:', allowedOrigins);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Permite requisições sem origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Em desenvolvimento, permite localhost
        if (
          process.env.NODE_ENV !== 'production' &&
          (origin.includes('localhost') || origin.includes('127.0.0.1'))
        ) {
          callback(null, true);
        } else {
          console.warn(`HTTP CORS: Origin não autorizada: ${origin}`);
          callback(new Error('Origin não autorizada pelo CORS'));
        }
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.enableCors(corsOptions);

  // Configura o adapter WebSocket customizado
  app.useWebSocketAdapter(new CustomIoAdapter(app, allowedOrigins));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  app.useGlobalFilters(new AppExceptionFilter());

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 WebSocket habilitado com CORS configurado`);
}

bootstrap().catch((err) => {
  console.error('Erro ao inicializar aplicação:', err);
  process.exit(1);
});
