// src/routes/exceptions/maps.exceptions.ts

/**
 * HIERARQUIA DE EXCEÇÕES PARA MAPAS
 *
 * Justificativa: Cria uma hierarquia específica de exceções para diferentes
 * tipos de erro que podem ocorrer com APIs de mapas. Isso permite:
 *
 * 1. Tratamento específico por tipo de erro
 * 2. Decisões de retry baseadas no tipo
 * 3. Status HTTP apropriados
 * 4. Logging e monitoramento mais precisos
 * 5. Melhor experiência do usuário com mensagens específicas
 */

import { HttpException } from '@nestjs/common';

/**
 * Classe base para todas as exceções relacionadas a mapas
 */
export abstract class MapsException extends HttpException {
  abstract readonly code: string;
  abstract readonly isRetryable: boolean;
  abstract readonly provider?: string;

  constructor(
    message: string,
    status: number,
    public readonly context?: Record<string, any>,
  ) {
    super(message, status);
    this.name = this.constructor.name;
  }

  /**
   * Retorna informações estruturadas sobre o erro
   */
  getErrorInfo() {
    return {
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      provider: this.provider,
      context: this.context,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Erro de autenticação - API Key inválida ou sem permissões
 */
export class ApiKeyInvalidException extends MapsException {
  readonly code = 'MAPS_API_KEY_INVALID';
  readonly isRetryable = false;
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(
      message || 'Chave de API inválida ou sem permissões necessárias',
      401,
      context,
    );
    this.provider = provider;
  }
}

/**
 * Erro de cota excedida - Limite de requests atingido
 */
export class QuotaExceededException extends MapsException {
  readonly code = 'MAPS_QUOTA_EXCEEDED';
  readonly isRetryable = true; // Pode tentar novamente após um tempo
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(
      message || 'Cota da API de mapas excedida. Tente novamente mais tarde.',
      429,
      context,
    );
    this.provider = provider;
  }
}

/**
 * Erro de localização não encontrada - Endereço inválido ou não existe
 */
export class LocationNotFoundException extends MapsException {
  readonly code = 'LOCATION_NOT_FOUND';
  readonly isRetryable = false; // Não adianta tentar o mesmo endereço
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(
      message || 'Localização não encontrada. Verifique o endereço informado.',
      404,
      context,
    );
    this.provider = provider;
  }
}

/**
 * Erro de timeout de rede - Request demorou demais
 */
export class NetworkTimeoutException extends MapsException {
  readonly code = 'NETWORK_TIMEOUT';
  readonly isRetryable = true; // Vale a pena tentar novamente
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(message || 'Timeout na conexão com o serviço de mapas', 408, context);
    this.provider = provider;
  }
}

/**
 * Erro de serviço indisponível - API externa fora do ar
 */
export class ServiceUnavailableException extends MapsException {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly isRetryable = true; // Serviço pode voltar
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(
      message || 'Serviço de mapas temporariamente indisponível',
      503,
      context,
    );
    this.provider = provider;
  }
}

/**
 * Erro de dados inválidos - Parâmetros malformados
 */
export class InvalidDataException extends MapsException {
  readonly code = 'INVALID_DATA';
  readonly isRetryable = false; // Dados estão errados
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(
      message || 'Dados inválidos fornecidos para a API de mapas',
      400,
      context,
    );
    this.provider = provider;
  }
}

/**
 * Erro de limite de taxa excedido - Muitos requests muito rápido
 */
export class RateLimitException extends MapsException {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly isRetryable = true; // Pode tentar após delay
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(
      message ||
        'Limite de taxa excedido. Aguarde antes de fazer nova solicitação.',
      429,
      context,
    );
    this.provider = provider;
  }
}

/**
 * Erro de configuração - Problema na configuração do adapter
 */
export class ConfigurationException extends MapsException {
  readonly code = 'CONFIGURATION_ERROR';
  readonly isRetryable = false; // Precisa corrigir configuração
  readonly provider?: string;

  constructor(
    message?: string,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(message || 'Erro de configuração do provedor de mapas', 500, context);
    this.provider = provider;
  }
}

/**
 * Erro genérico de API externa - Para casos não mapeados
 */
export class ExternalApiException extends MapsException {
  readonly code = 'EXTERNAL_API_ERROR';
  readonly isRetryable: boolean;
  readonly provider?: string;

  constructor(
    message: string,
    isRetryable: boolean = true,
    provider?: string,
    context?: Record<string, any>,
  ) {
    super(message, 502, context);
    this.isRetryable = isRetryable;
    this.provider = provider;
  }
}

// =============================================================================
// FACTORY PARA CRIAR EXCEÇÕES BASEADAS EM RESPOSTAS DE API
// =============================================================================

export class MapsExceptionFactory {
  /**
   * Cria uma exceção apropriada baseada no status HTTP e provider
   */
  static fromHttpStatus(
    status: number,
    message: string,
    provider: string,
    context?: Record<string, any>,
  ): MapsException {
    switch (status) {
      case 400:
        return new InvalidDataException(message, provider, context);
      case 401:
      case 403:
        return new ApiKeyInvalidException(message, provider, context);
      case 404:
        return new LocationNotFoundException(message, provider, context);
      case 408:
        return new NetworkTimeoutException(message, provider, context);
      case 429:
        return new QuotaExceededException(message, provider, context);
      case 503:
        return new ServiceUnavailableException(message, provider, context);
      default:
        return new ExternalApiException(
          message,
          status >= 500,
          provider,
          context,
        );
    }
  }

  /**
   * Cria uma exceção baseada no status de resposta do Google Maps
   */
  static fromGoogleMapsStatus(
    status: string,
    errorMessage?: string,
    context?: Record<string, any>,
  ): MapsException {
    const provider = 'GoogleMaps';

    switch (status) {
      case 'REQUEST_DENIED':
        return new ApiKeyInvalidException(
          errorMessage || 'API Key inválida ou requisição negada',
          provider,
          { googleStatus: status, ...context },
        );
      case 'OVER_QUERY_LIMIT':
        return new QuotaExceededException(
          errorMessage || 'Limite de consultas do Google Maps excedido',
          provider,
          { googleStatus: status, ...context },
        );
      case 'ZERO_RESULTS':
      case 'NOT_FOUND':
        return new LocationNotFoundException(
          errorMessage || 'Localização não encontrada',
          provider,
          { googleStatus: status, ...context },
        );
      case 'INVALID_REQUEST':
        return new InvalidDataException(
          errorMessage || 'Parâmetros da requisição inválidos',
          provider,
          { googleStatus: status, ...context },
        );
      case 'UNKNOWN_ERROR':
      default:
        return new ExternalApiException(
          errorMessage || `Erro do Google Maps: ${status}`,
          true,
          provider,
          { googleStatus: status, ...context },
        );
    }
  }

  /**
   * Cria uma exceção baseada em erro de rede/axios
   */
  static fromNetworkError(error: any, provider: string): MapsException {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new NetworkTimeoutException(
        'Timeout na conexão com a API de mapas',
        provider,
        { originalError: error.code },
      );
    }

    if (error.response) {
      return this.fromHttpStatus(
        error.response.status,
        error.response.data?.error_message || error.message,
        provider,
        {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response.status,
        },
      );
    }

    // Erro de rede sem resposta
    return new ServiceUnavailableException(
      'Falha na conexão com o serviço de mapas',
      provider,
      { originalError: error.message },
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Verifica se um erro é retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof MapsException) {
    return error.isRetryable;
  }

  // Para outros tipos de erro, assume que pode tentar novamente
  // se for um erro de servidor (5xx) ou timeout
  if (error.response?.status >= 500) {
    return true;
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  return false;
}

/**
 * Extrai informações de contexto de um erro para logging
 */
export function extractErrorContext(error: any): Record<string, any> {
  const context: Record<string, any> = {
    name: error.name,
    message: error.message,
  };

  if (error instanceof MapsException) {
    context.code = error.code;
    context.provider = error.provider;
    context.isRetryable = error.isRetryable;
    context.customContext = error.context;
  }

  if (error.response) {
    context.httpStatus = error.response.status;
    context.httpData = error.response.data;
  }

  if (error.config) {
    context.url = error.config.url;
    context.method = error.config.method;
  }

  return context;
}

// =============================================================================
// EXEMPLO DE USO
// =============================================================================

/*
// No seu adapter:

try {
  const response = await axios.get(this.geocodeApiUrl, { params });
  
  if (response.data.status !== 'OK') {
    throw MapsExceptionFactory.fromGoogleMapsStatus(
      response.data.status,
      response.data.error_message,
      { address: params.address }
    );
  }
  
} catch (error) {
  if (error instanceof MapsException) {
    throw error; // Re-throw exceções já tratadas
  }
  
  // Transforma erros de rede em exceções específicas
  throw MapsExceptionFactory.fromNetworkError(error, 'GoogleMaps');
}

// No seu service ou controller:

try {
  return await this.mapsAdapter.geocodeAddresses(addresses);
} catch (error) {
  if (error instanceof MapsException) {
    this.logger.error('Maps error:', error.getErrorInfo());
    
    if (error.isRetryable) {
      // Implementar retry ou adicionar à fila
    }
  }
  
  throw error;
}
*/
