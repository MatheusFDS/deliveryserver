// src/infrastructure/resilience/circuit-breaker.interface.ts

/**
 * Injection Token para o serviço de Circuit Breaker.
 */
export const CIRCUIT_BREAKER_SERVICE = 'CircuitBreakerService';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  successThreshold?: number;
}

/**
 * Define o contrato que o serviço de Circuit Breaker deve seguir.
 */
export interface ICircuitBreakerService {
  /**
   * Executa uma operação protegida pelo circuit breaker.
   * @param circuitName Um nome único para o circuito (ex: 'google-maps-api').
   * @param operation A função (Promise) a ser executada.
   * @param config Configurações específicas para este circuito, que sobrescrevem os padrões.
   * @returns O resultado da operação.
   */
  execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T>;

  // Outros métodos para monitoramento podem ser adicionados aqui
}
