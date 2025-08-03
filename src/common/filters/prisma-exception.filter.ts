// src/common/filters/prisma-exception.filter.ts
import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocorreu um erro inesperado no banco de dados.';

    this.logger.error(
      `Prisma Error - Code: ${exception.code}, Message: ${exception.message}, Path: ${request.url}`,
      exception.stack,
    );

    switch (exception.code) {
      case 'P2000': // The value provided for the column is too long for the column's type.
        status = HttpStatus.BAD_REQUEST;
        message = 'Um dos valores fornecidos é muito longo.';
        break;
      case 'P2002': // Unique constraint violation
        status = HttpStatus.CONFLICT;
        const target =
          (exception.meta?.target as string[])?.join(', ') || 'campo(s)';
        message = `Um registro com este ${target} já existe.`;
        break;
      case 'P2003': // Foreign key constraint failed
        status = HttpStatus.BAD_REQUEST;
        message =
          'Não é possível realizar a operação devido a dados relacionados existentes.';
        break;
      case 'P2005': // The value stored in the database is invalid for the column's type.
        status = HttpStatus.BAD_REQUEST;
        message = 'Valor inválido no banco de dados.';
        break;
      case 'P2006': // The provided value is not valid for the enum type.
        status = HttpStatus.BAD_REQUEST;
        message = 'Valor inválido para o tipo enumerado.';
        break;
      case 'P2007': // Data validation error
        status = HttpStatus.BAD_REQUEST;
        message = 'Erro de validação de dados.';
        break;
      case 'P2011': // Null constraint violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Um campo obrigatório não foi fornecido.';
        break;
      case 'P2014': // The change you are trying to make requires a record that does not exist.
        status = HttpStatus.BAD_REQUEST;
        message = 'A operação requer um registro relacionado que não existe.';
        break;
      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado para a operação solicitada.';
        break;
      default:
        // Para outros erros não explicitamente mapeados
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message =
          'Ocorreu um erro inesperado no banco de dados. Por favor, tente novamente mais tarde.';
        break;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
