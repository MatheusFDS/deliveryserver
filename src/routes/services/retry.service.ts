// src/routes/services/retry.service.ts

/**
 * RETRY SERVICE - BACKOFF EXPONENCIAL
 *
 * Justificativa: Implementa estratégias de retry inteligentes para recuperação
 * automática de falhas temporárias em APIs externas.
 *
 * Características:
 * - Backoff exponencial: Evita sobrecarregar serviços que já estão falhando
 * - Jitter: Adiciona aleatoriedade para evitar "thundering herd"
 * - Retry condicional: Só tenta novamente se o erro for retryable
 * - Timeout progressivo: Aumenta timeout a cada tentativa
 * - Logging detalhado: Para monitoramento e debugging
 */

import { Injectable, Logger } from '@nestjs/common';
import { MapsException, isRetryableError } from '../exceptions/maps.exceptions';

interface RetryConfig {
  maxAttempts: number; // Máximo de tentativas
  baseDelay: number; // Delay base em ms
  maxDelay: number; // Delay máximo em ms
  backoffMultiplier: number; // Multiplicador para backoff exponencial
  jitter: boolean; // Se deve adicionar aleatoriedade
  timeoutMultiplier?: number; // Multiplicador de timeout por tentativa
}

interface RetryContext {
  operation: string;
  attempt: number;
  totalAttempts: number;
  delay: number;
  startTime: number;
  lastError?: any;
}

type RetryPredicate = (error: any, attempt: number) => boolean;

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Executa uma operação com retry automático
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
    },
    operationName?: string,
    customRetryPredicate?: RetryPredicate,
  ): Promise<T> {
    const context: RetryContext = {
      operation: operationName || 'unknown',
      attempt: 0,
      totalAttempts: config.maxAttempts,
      delay: 0,
      startTime: Date.now(),
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      context.attempt = attempt;

      try {
        // Log da tentativa (exceto a primeira)
        if (attempt > 1) {
          this.logger.debug(
            `Retry attempt ${attempt}/${config.maxAttempts} for ${context.operation}`,
          );
        }

        const result = await operation();

        // Se chegou aqui, a operação foi bem-sucedida
        if (attempt > 1) {
          const totalTime = Date.now() - context.startTime;
          this.logger.log(
            `Operation ${context.operation} succeeded on attempt ${attempt}/${config.maxAttempts} ` +
              `after ${totalTime}ms`,
          );
        }

        return result;
      } catch (error) {
        lastError = error;
        context.lastError = error;

        // Determina se deve tentar novamente
        const shouldRetry = this.shouldRetry(
          error,
          attempt,
          config.maxAttempts,
          customRetryPredicate,
        );

        // Se não deve tentar novamente ou é a última tentativa
        if (!shouldRetry || attempt === config.maxAttempts) {
          const totalTime = Date.now() - context.startTime;

          this.logger.error(
            `Operation ${context.operation} failed after ${attempt} attempts ` +
              `and ${totalTime}ms:`,
            this.extractErrorInfo(error),
          );

          break;
        }

        // Calcula o delay para a próxima tentativa
        const delay = this.calculateDelay(attempt, config);
        context.delay = delay;

        this.logger.warn(
          `Attempt ${attempt}/${config.maxAttempts} failed for ${context.operation}, ` +
            `retrying in ${delay}ms:`,
          this.extractErrorInfo(error),
        );

        // Aguarda antes da próxima tentativa
        await this.delay(delay);
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
  }

  /**
   * Versão simplificada para casos específicos
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      baseDelay,
      maxDelay: baseDelay * 8,
      backoffMultiplier: 2,
      jitter: true,
    });
  }

  /**
   * Retry específico para operações de rede
   */
  async withNetworkRetry<T>(
    operation: () => Promise<T>,
    operationName?: string,
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      {
        maxAttempts: 4,
        baseDelay: 1000,
        maxDelay: 15000,
        backoffMultiplier: 2.5,
        jitter: true,
        timeoutMultiplier: 1.5,
      },
      operationName,
      this.isNetworkRetryable,
    );
  }

  /**
   * Retry para operações críticas com mais tentativas
   */
  async withCriticalRetry<T>(
    operation: () => Promise<T>,
    operationName?: string,
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      {
        maxAttempts: 6,
        baseDelay: 500,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
      },
      operationName,
    );
  }

  /**
   * Determina se deve fazer retry baseado no erro
   */
  private shouldRetry(
    error: any,
    attempt: number,
    maxAttempts: number,
    customPredicate?: RetryPredicate,
  ): boolean {
    // Se é a última tentativa, não retry
    if (attempt >= maxAttempts) {
      return false;
    }

    // Se há um predicado customizado, usa ele
    if (customPredicate) {
      return customPredicate(error, attempt);
    }

    // Se é uma MapsException, verifica se é retryable
    if (error instanceof MapsException) {
      return error.isRetryable;
    }

    // Usa a função helper geral
    return isRetryableError(error);
  }

  /**
   * Predicado específico para erros de rede
   */
  private isNetworkRetryable = (error: any, attempt: number): boolean => {
    // Códigos de erro de rede que vale a pena tentar novamente
    const retryableNetworkCodes = [
      'ECONNABORTED',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
    ];

    if (retryableNetworkCodes.includes(error.code)) {
      return true;
    }

    // Status HTTP que podem ser temporários
    if (error.response?.status) {
      const status = error.response.status;

      // 5xx: Erros de servidor
      if (status >= 500) {
        return true;
      }

      // 429: Rate limiting (mas com menos tentativas)
      if (status === 429 && attempt <= 2) {
        return true;
      }

      // 408: Request timeout
      if (status === 408) {
        return true;
      }
    }

    return false;
  };

  /**
   * Calcula o delay para a próxima tentativa com backoff exponencial
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Delay base com backoff exponencial
    let delay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);

    // Aplica o limite máximo
    delay = Math.min(delay, config.maxDelay);

    // Adiciona jitter se configurado
    if (config.jitter) {
      // Adiciona uma variação aleatória de ±25%
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  /**
   * Aguarda por um período especificado
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extrai informações úteis do erro para logging
   */
  private extractErrorInfo(error: any): Record<string, any> {
    const info: Record<string, any> = {
      name: error.name,
      message: error.message,
    };

    if (error instanceof MapsException) {
      info.code = error.code;
      info.provider = error.provider;
      info.isRetryable = error.isRetryable;
    }

    if (error.response) {
      info.status = error.response.status;
      info.statusText = error.response.statusText;
    }

    if (error.code) {
      info.errorCode = error.code;
    }

    return info;
  }

  /**
   * Cria um wrapper que automaticamente adiciona retry a uma função
   */
  withAutoRetry<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    config?: Partial<RetryConfig>,
    operationName?: string,
  ): T {
    return (async (...args: any[]) => {
      return this.executeWithRetry(
        () => fn(...args),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
          ...config,
        },
        operationName || fn.name,
      );
    }) as T;
  }

  /**
   * Executa múltiplas operações com retry, falhando apenas se todas falharem
   */
  async executeWithFallback<T>(
    operations: Array<() => Promise<T>>,
    operationNames?: string[],
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < operations.length; i++) {
      try {
        const operationName = operationNames?.[i] || `operation-${i}`;
        return await this.executeWithRetry(
          operations[i],
          {
            maxAttempts: 2, // Menos tentativas para cada fallback
            baseDelay: 500,
            maxDelay: 2000,
            backoffMultiplier: 2,
            jitter: true,
          },
          operationName,
        );
      } catch (error) {
        lastError = error;

        if (i < operations.length - 1) {
          this.logger.warn(
            `Fallback ${i} failed, trying next option:`,
            error.message,
          );
        }
      }
    }

    this.logger.error('All fallback operations failed');
    throw lastError!;
  }
}

// =============================================================================
// DECORADOR PARA RETRY AUTOMÁTICO
// =============================================================================

/**
 * Decorador que adiciona retry automático a métodos
 */
export function WithRetry(config?: Partial<RetryConfig>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const retryService = new RetryService();

      return retryService.executeWithRetry(
        () => originalMethod.apply(this, args),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          jitter: true,
          ...config,
        },
        `${target.constructor.name}.${propertyKey}`,
      );
    };

    return descriptor;
  };
}

// =============================================================================
// EXEMPLO DE USO
// =============================================================================

/*
// Uso básico:
const result = await this.retryService.executeWithRetry(
  () => axios.get('https://api.exemplo.com/data'),
  {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
  },
  'api-call'
);

// Uso com decorador:
class ApiService {
  @WithRetry({ maxAttempts: 5, baseDelay: 2000 })
  async chamarApiExterna() {
    return axios.get('https://api.exemplo.com/data');
  }
}

// Uso com fallback:
const result = await this.retryService.executeWithFallback([
  () => this.primaryApi.getData(),
  () => this.secondaryApi.getData(),
  () => this.cacheService.getCachedData(),
], ['primary-api', 'secondary-api', 'cache']);
*/
