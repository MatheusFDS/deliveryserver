// Adapte este CONCEITO ao seu http-exception.filter.ts que FUNCIONA
// Certifique-se de que as importações de Request e Response (ou ExpressRequest/ExpressResponse)
// e a estrutura Catch e argumentsHost estejam conforme o seu código.

// Exemplo conceitual com os logs que precisamos:
import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
// Use suas importações de Request e Response aqui que funcionam para você
// Ex: import { Request, Response as ExpressResponse } from 'express';
// Ou: import { Request, Response } from 'express';

@Catch(HttpException) // O filtro deve capturar HttpException
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    // Use o tipo de Response que funciona para você, ex: <Response>() ou <ExpressResponse>()
    const response = ctx.getResponse<any>();
    // Use o tipo de Request que funciona para você, ex: <Request>()
    const request = ctx.getRequest<any>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse();
    const message =
      typeof errorResponse === 'object' && 'message' in errorResponse
        ? errorResponse.message
        : exception.message;

    // --- ESTES SÃO OS LOGS DE DEPURACAO CRÍTICOS ---
    console.log('--- HttpExceptionFilter Ativado (Seu Formato) ---');
    console.log('Status HTTP:', status);
    console.log('Mensagem da Exceção (Filtro):', message);
    console.log('Path da Requisição:', request.url);
    console.log('Objeto da Exceção Completa:', exception);
    console.log('--- Fim Log de Depuração do Filtro ---');
    // --- FIM DOS LOGS DE DEPURACAO CRÍTICOS ---

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
