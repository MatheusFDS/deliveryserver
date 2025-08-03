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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      message =
        typeof errorResponse === 'object' &&
        errorResponse !== null &&
        'message' in errorResponse
          ? (errorResponse as any).message
          : exception.message;
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

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
