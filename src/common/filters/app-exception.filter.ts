// src/common/filters/app-exception.filter.ts

/**
 * APP EXCEPTION FILTER MELHORADO
 *
 * Justificativa: Integra o filter existente com as novas MapsException
 * e melhora o tratamento de erros mantendo a estrutura atual.
 *
 * Melhorias:
 * - Suporte para MapsException
 * - Request ID tracking
 * - Melhor estruturação de respostas
 * - Mantém compatibilidade total
 */

import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Importar as novas exceções de mapas
import { MapsException } from '../../routes/exceptions/maps.exceptions';

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
    let errorCode: string | undefined;
    let isRetryable: boolean | undefined;
    let provider: string | undefined;

    // Extrair requestId se disponível (do middleware)
    const requestId =
      request.requestId ||
      `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // === TRATAMENTO DE MAPS EXCEPTION (NOVO) ===
    if (exception instanceof MapsException) {
      status = exception.getStatus();
      message = exception.message;
      errorCode = exception.code;
      isRetryable = exception.isRetryable;
      provider = exception.provider;
      details = exception.context;

      this.logger.error(
        `Maps API Error [${requestId}] - Provider: ${provider}, Code: ${errorCode}, Retryable: ${isRetryable}`,
        {
          requestId,
          provider,
          code: errorCode,
          isRetryable,
          context: exception.context,
          stack: exception.stack,
        },
      );
    }
    // === TRATAMENTO DE HTTP EXCEPTION (MANTIDO) ===
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object' && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        if ((errorResponse as any).errors) {
          details = (errorResponse as any).errors;
        }
      } else {
        message = String(errorResponse);
      }

      this.logger.error(
        `HTTP Exception [${requestId}] - Status: ${status}, Message: ${message}`,
        {
          requestId,
          status,
          message,
          details,
          stack: exception.stack,
        },
      );
    }
    // === TRATAMENTO DE PRISMA EXCEPTION (MANTIDO) ===
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2000':
          status = HttpStatus.BAD_REQUEST;
          message = 'Um dos valores fornecidos é muito longo.';
          errorCode = 'PRISMA_VALUE_TOO_LONG';
          break;
        case 'P2002':
          status = HttpStatus.CONFLICT;
          const target =
            (exception.meta?.target as string[])?.join(', ') || 'campo(s)';
          message = `Um registro com este ${target} já existe.`;
          errorCode = 'PRISMA_UNIQUE_CONSTRAINT';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Já existem registros lançados para esse registro.';
          errorCode = 'PRISMA_FOREIGN_KEY_CONSTRAINT';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado.';
          errorCode = 'PRISMA_RECORD_NOT_FOUND';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message =
            'Ocorreu um erro inesperado no banco de dados. Tente novamente mais tarde.';
          errorCode = `PRISMA_${exception.code}`;
          break;
      }

      this.logger.error(
        `Prisma Error [${requestId}] - Code: ${exception.code}, Message: ${message}`,
        {
          requestId,
          prismaCode: exception.code,
          meta: exception.meta,
          stack: exception.stack,
        },
      );
    }
    // === TRATAMENTO DE ERRO GENÉRICO (MANTIDO) ===
    else {
      this.logger.error(`Unhandled Exception [${requestId}] - ${exception}`, {
        requestId,
        exception:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    // Log adicional para o console (desenvolvimento)
    this.logger.error(
      `Exception - Status: ${status}, Message: ${message}, Path: ${request.url}, RequestId: ${requestId}`,
      exception instanceof Error ? exception.stack : '',
    );

    // === ESTRUTURA DE RESPOSTA MELHORADA ===
    const responseBody: any = {
      success: false, // Adicionar para consistência com responses de sucesso
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      requestId, // Importante para debugging
    };

    // Adicionar campos específicos baseado no tipo de erro
    if (errorCode) {
      responseBody.code = errorCode;
    }

    if (provider) {
      responseBody.provider = provider;
    }

    if (isRetryable !== undefined) {
      responseBody.isRetryable = isRetryable;
    }

    if (details) {
      responseBody.errors = details;
    }

    // Informações adicionais para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      responseBody.debug = {
        exceptionType: exception?.constructor?.name,
        stack: exception instanceof Error ? exception.stack : undefined,
      };
    }

    response.status(status).json(responseBody);
  }
}

// =============================================================================
// VERSÃO MÍNIMA (APENAS ADICIONA MAPS EXCEPTION)
// =============================================================================

/**
 * Versão que apenas adiciona suporte a MapsException ao seu filter atual
 */
@Catch()
export class MinimalAppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MinimalAppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno no servidor.';
    let details: any;

    // === NOVO: Tratar MapsException ===
    if (exception instanceof MapsException) {
      status = exception.getStatus();
      message = exception.message;

      // Log específico para erros de mapas
      this.logger.error(
        `Maps API Error - Provider: ${exception.provider}, Code: ${exception.code}`,
        exception.stack,
      );
    }
    // === SEU CÓDIGO ATUAL (MANTIDO) ===
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object' && errorResponse !== null) {
        message = (errorResponse as any).message || exception.message;
        if ((errorResponse as any).errors) {
          details = (errorResponse as any).errors;
        }
      } else {
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
