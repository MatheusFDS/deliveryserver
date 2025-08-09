// src/common/middleware/logger.middleware.ts

/**
 * LOGGER MIDDLEWARE MELHORADO
 *
 * Justificativa: Melhora o middleware existente adicionando:
 * - Timing de requests
 * - Log de entrada E saída
 * - Request ID único para rastreamento
 * - Melhor estruturação de logs
 * - Compatibilidade com Winston existente
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import {
  createLogger,
  Logger as WinstonLogger,
  transports,
  format,
} from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly winstonLogger: WinstonLogger;
  private readonly nestLogger = new Logger('HTTP');

  constructor() {
    this.winstonLogger = this.createWinstonLogger();
  }

  private createWinstonLogger(): WinstonLogger {
    return createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json(), // Melhor para parsing
      ),
      transports: [
        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880,
          maxFiles: 5,
        }),
        ...(process.env.NODE_ENV !== 'production'
          ? [
              new transports.Console({
                format: format.combine(format.colorize(), format.simple()),
              }),
            ]
          : []),
      ],
    });
  }

  use(req: any, res: any, next: () => void): void {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Adicionar requestId ao request para outros middlewares/controllers usarem
    req.requestId = requestId;

    // Extrair informações da request
    const { method, originalUrl, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userEmail = req.user?.email || 'guest';
    const userId = req.user?.userId || 'anonymous';

    // Log de entrada detalhado
    const requestInfo = {
      requestId,
      type: 'REQUEST_START',
      method,
      url: originalUrl,
      ip: this.getClientIp(req),
      userAgent: userAgent.substring(0, 100),
      userEmail,
      userId,
      timestamp: new Date().toISOString(),
    };

    // Log simples para console (desenvolvimento)
    this.nestLogger.log(
      `→ [${requestId}] ${method} ${originalUrl} - User: ${userEmail}`,
    );

    // Log detalhado para arquivo (produção)
    this.winstonLogger.info('Request started', requestInfo);

    // Interceptar a resposta para log de saída
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function (data: any) {
      logResponse.call(this, data);
      return originalSend.call(this, data);
    };

    res.json = function (data: any) {
      logResponse.call(this, data);
      return originalJson.call(this, data);
    };

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    function logResponse(data: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const statusCode = res.statusCode;

      // Informações da resposta
      const responseInfo = {
        requestId,
        type: 'REQUEST_END',
        method,
        url: originalUrl,
        statusCode,
        duration,
        userEmail,
        userId,
        responseSize: data ? JSON.stringify(data).length : 0,
        timestamp: new Date().toISOString(),
      };

      // Log simples para console
      const statusEmoji = statusCode >= 400 ? '✗' : '✓';

      self.nestLogger.log(
        `← [${requestId}] ${statusEmoji} ${method} ${originalUrl} - ${statusCode} - ${duration}ms - User: ${userEmail}`,
      );

      // Log detalhado para arquivo
      if (statusCode >= 400) {
        self.winstonLogger.error('Request failed', responseInfo);
      } else if (duration > 2000) {
        self.winstonLogger.warn('Slow request detected', responseInfo);
      } else {
        self.winstonLogger.info('Request completed', responseInfo);
      }

      // Alertas especiais
      if (duration > 5000) {
        self.nestLogger.warn(
          `🐌 Very slow request: ${method} ${originalUrl} - ${duration}ms`,
        );
      }

      if (statusCode >= 500) {
        self.nestLogger.error(
          `🚨 Server error: ${method} ${originalUrl} - ${statusCode}`,
        );
      }
    }

    next();
  }

  /**
   * Gera ID único para request
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Extrai IP real considerando proxies
   */
  private getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    )
      ?.split(',')[0]
      ?.trim();
  }
}

// =============================================================================
// VERSÃO SIMPLES (ALTERNATIVA)
// =============================================================================

/**
 * Versão simplificada que apenas adiciona timing ao seu middleware atual
 */
@Injectable()
export class SimpleLoggerMiddleware implements NestMiddleware {
  private readonly logger: WinstonLogger;
  private readonly nestLogger = new Logger('HTTP');

  constructor() {
    this.logger = this.createWinstonLogger();
  }

  private createWinstonLogger(): WinstonLogger {
    return createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(
          ({ timestamp, level, message }) =>
            `${timestamp} ${level}: ${message}`,
        ),
      ),
      transports: [
        new transports.File({ filename: 'combined.log' }),
        new transports.Console(),
      ],
    });
  }

  use(req: any, res: any, next: () => void): void {
    const startTime = Date.now();
    const userEmail = req.user?.email ?? 'guest';
    const { method, originalUrl, ip } = req;

    // Log de entrada (seu código atual)
    const logMessage = `User: ${userEmail} | Method: ${method} | URL: ${originalUrl} | IP: ${ip}`;
    this.logger.info(logMessage);

    // Adicionar timing de resposta
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const completionMessage = `COMPLETED: ${method} ${originalUrl} - ${res.statusCode} - ${duration}ms - User: ${userEmail}`;

      // Log para winston (arquivo)
      this.logger.info(completionMessage);

      // Log para console (mais visual)
      this.nestLogger.log(
        `← ${method} ${originalUrl} - ${res.statusCode} - ${duration}ms`,
      );

      return originalSend.call(this, data);
    }.bind(this);

    next();
  }
}
