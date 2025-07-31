import { Injectable, NestMiddleware } from '@nestjs/common';
import { createLogger, Logger, transports, format } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger: Logger;

  constructor() {
    this.logger = this.createWinstonLogger();
  }

  private createWinstonLogger(): Logger {
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
    const userEmail = req.user?.email ?? 'guest';
    const { method, originalUrl, ip } = req;
    const logMessage = `User: ${userEmail} | Method: ${method} | URL: ${originalUrl} | IP: ${ip}`;

    this.logger.info(logMessage);
    next();
  }
}
