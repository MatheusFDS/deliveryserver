// src/infrastructure/resilience/retry.interface.ts

/**
 * Injection Token para o serviço de Retry.
 */
export const RETRY_SERVICE = 'RetryService';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export type RetryPredicate = (error: any) => boolean;

/**
 * Define o contrato que o serviço de Retry deve seguir.
 */
export interface IRetryService {
  /**
   * Executa uma operação com uma estratégia de retry configurável.
   * @param operation A função (Promise) a ser executada.
   * @param config Configurações que sobrescrevem a política de retry padrão.
   * @param operationName Um nome para a operação, usado para logging.
   * @param customRetryPredicate Uma função opcional para decidir se um erro específico deve ser tentado novamente.
   */
  executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    operationName?: string,
    customRetryPredicate?: RetryPredicate,
  ): Promise<T>;
}
