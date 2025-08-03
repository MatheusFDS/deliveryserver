// src/common/filters/http-exception.filter.ts
import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Mensagem de erro padrão ou a que vem da exceção
    const errorResponse = exception.getResponse();
    const message =
      typeof errorResponse === 'object' && 'message' in errorResponse
        ? errorResponse.message
        : exception.message;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message, // Garante que a mensagem seja sempre retornada
    });
  }
}
