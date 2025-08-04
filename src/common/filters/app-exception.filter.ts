import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno no servidor.';
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object' && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        if ((errorResponse as any).errors) {
          details = (errorResponse as any).errors;
        }
      } else {
        // Correção: Garante que a mensagem seja sempre uma string
        message = String(errorResponse);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2000':
          status = HttpStatus.BAD_REQUEST;
          message = 'Um dos valores fornecidos é muito longo.';
          break;
        case 'P2002':
          status = HttpStatus.CONFLICT;
          const target =
            (exception.meta?.target as string[])?.join(', ') || 'campo(s)';
          message = `Um registro com este ${target} já existe.`;
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Já existem registros lançados para esse registro.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado.';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message =
            'Ocorreu um erro inesperado no banco de dados. Tente novamente mais tarde.';
          break;
      }
    }

    this.logger.error(
      `Exception - Status: ${status}, Message: ${message}, Path: ${request.url}`,
      exception instanceof Error ? exception.stack : '',
    );

    const responseBody: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    if (details) {
      responseBody.errors = details;
    }

    response.status(status).json(responseBody);
  }
}
