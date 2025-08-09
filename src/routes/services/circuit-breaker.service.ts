// src/routes/services/circuit-breaker.service.ts

/**
 * CIRCUIT BREAKER SERVICE
 *
 * Justificativa: Implementa o padrão Circuit Breaker para proteger o sistema
 * contra falhas cascata quando APIs externas ficam indisponíveis.
 *
 * Estados do Circuit:
 * - CLOSED: Funcionamento normal, requests passam
 * - OPEN: Muitas falhas detectadas, requests são rejeitadas imediatamente
 * - HALF_OPEN: Testando se o serviço se recuperou
 *
 * Benefícios:
 * - Previne sobrecarga em serviços que já estão falhando
 * - Falha rápida quando o serviço está indisponível
 * - Recuperação automática quando o serviço volta
 * - Isolamento de falhas
 */

import { Injectable, Logger } from '@nestjs/common';

// Importa a exceção que será lançada quando o circuit estiver aberto
import { ServiceUnavailableException } from '../exceptions/maps.exceptions';

export enum CircuitState {
  CLOSED = 'CLOSED', // Funcionamento normal
  OPEN = 'OPEN', // Circuit aberto, rejeitando requests
  HALF_OPEN = 'HALF_OPEN', // Testando se o serviço se recuperou
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Número de falhas para abrir o circuit
  resetTimeout: number; // Tempo para tentar reabrir (ms)
  monitoringPeriod: number; // Período de monitoramento (ms)
  successThreshold?: number; // Sucessos necessários para fechar no estado HALF_OPEN
}

interface CircuitInfo {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  config: CircuitBreakerConfig;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, CircuitInfo>();

  /**
   * Obtém ou cria um circuit breaker para um serviço específico
   */
  private getCircuit(name: string, config: CircuitBreakerConfig): CircuitInfo {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        config: {
          ...config,
          successThreshold: config.successThreshold || 3, // Default: 3 sucessos para fechar
        },
        totalCalls: 0,
        totalFailures: 0,
        totalSuccesses: 0,
      });

      this.logger.log(`Circuit breaker created for: ${name}`);
    }
    return this.circuits.get(name)!;
  }

  /**
   * Executa uma operação protegida pelo circuit breaker
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minuto
      monitoringPeriod: 300000, // 5 minutos
      successThreshold: 3,
    },
  ): Promise<T> {
    const circuit = this.getCircuit(circuitName, config);
    circuit.totalCalls++;

    // Verifica o estado atual do circuit
    this.updateCircuitState(circuit);

    // Se o circuit está aberto e ainda não é hora de tentar
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttemptTime) {
        this.logger.warn(
          `Circuit breaker is OPEN for ${circuitName}, rejecting request`,
        );
        throw new ServiceUnavailableException(
          `Serviço ${circuitName} temporariamente indisponível. Circuit breaker ativo.`,
        );
      } else {
        // Hora de tentar novamente - muda para HALF_OPEN
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successes = 0;
        this.logger.log(
          `Circuit breaker changed to HALF_OPEN for ${circuitName}`,
        );
      }
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      this.onSuccess(circuit, circuitName, duration);
      return result;
    } catch (error) {
      this.onFailure(circuit, circuitName, error);
      throw error;
    }
  }

  /**
   * Atualiza o estado do circuit baseado no tempo
   */
  private updateCircuitState(circuit: CircuitInfo): void {
    const now = Date.now();

    // Se está no período de monitoramento, reseta contadores
    if (
      circuit.lastFailureTime > 0 &&
      now - circuit.lastFailureTime > circuit.config.monitoringPeriod
    ) {
      circuit.failures = 0;
      if (circuit.state === CircuitState.CLOSED) {
        this.logger.debug('Circuit breaker monitoring period reset');
      }
    }
  }

  /**
   * Processa uma operação bem-sucedida
   */
  private onSuccess(
    circuit: CircuitInfo,
    circuitName: string,
    duration: number,
  ): void {
    circuit.totalSuccesses++;
    circuit.successes++;

    this.logger.debug(
      `Circuit breaker success for ${circuitName} (${duration}ms)`,
    );

    if (circuit.state === CircuitState.HALF_OPEN) {
      // No estado HALF_OPEN, conta sucessos para decidir se fecha o circuit
      if (circuit.successes >= circuit.config.successThreshold!) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
        this.logger.log(
          `Circuit breaker CLOSED for ${circuitName} after ${circuit.config.successThreshold} successes`,
        );
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // No estado CLOSED, apenas reseta falhas se houver sucessos
      if (circuit.failures > 0) {
        circuit.failures = Math.max(0, circuit.failures - 1);
      }
    }
  }

  /**
   * Processa uma falha na operação
   */
  private onFailure(
    circuit: CircuitInfo,
    circuitName: string,
    error: any,
  ): void {
    circuit.failures++;
    circuit.totalFailures++;
    circuit.lastFailureTime = Date.now();

    this.logger.warn(
      `Circuit breaker failure for ${circuitName}:`,
      error.message,
    );

    // Se excedeu o threshold de falhas, abre o circuit
    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptTime = Date.now() + circuit.config.resetTimeout;
      circuit.successes = 0;

      this.logger.error(
        `Circuit breaker OPENED for ${circuitName} after ${circuit.failures} failures. ` +
          `Next attempt in ${circuit.config.resetTimeout}ms`,
      );
    }
  }

  /**
   * Obtém estatísticas de um circuit breaker específico
   */
  getCircuitStats(circuitName: string): CircuitInfo | null {
    return this.circuits.get(circuitName) || null;
  }

  /**
   * Obtém estatísticas de todos os circuits
   */
  getAllCircuitStats(): Map<string, CircuitInfo> {
    return new Map(this.circuits);
  }

  /**
   * Força o fechamento de um circuit (para testes ou intervenção manual)
   */
  forceClose(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
      this.logger.log(`Circuit breaker manually CLOSED for ${circuitName}`);
    }
  }

  /**
   * Força a abertura de um circuit (para manutenção ou intervenção manual)
   */
  forceOpen(circuitName: string, duration: number = 60000): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptTime = Date.now() + duration;
      this.logger.log(
        `Circuit breaker manually OPENED for ${circuitName} for ${duration}ms`,
      );
    }
  }

  /**
   * Remove um circuit breaker (para cleanup)
   */
  removeCircuit(circuitName: string): void {
    const removed = this.circuits.delete(circuitName);
    if (removed) {
      this.logger.log(`Circuit breaker removed for ${circuitName}`);
    }
  }

  /**
   * Reseta as estatísticas de um circuit (mantém o estado)
   */
  resetStats(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.totalCalls = 0;
      circuit.totalFailures = 0;
      circuit.totalSuccesses = 0;
      this.logger.log(`Circuit breaker stats reset for ${circuitName}`);
    }
  }
}

// =============================================================================
// EXEMPLO DE USO
// =============================================================================

/*
// No seu adapter ou service:

constructor(
  private readonly circuitBreaker: CircuitBreakerService
) {}

async chamarApiExterna() {
  return this.circuitBreaker.execute(
    'google-maps-api',
    async () => {
      // Sua chamada para API externa aqui
      return await axios.get('https://maps.googleapis.com/...');
    },
    {
      failureThreshold: 3,    // Abre após 3 falhas
      resetTimeout: 30000,    // Tenta novamente após 30s
      monitoringPeriod: 60000, // Reseta contadores após 1min sem falhas
      successThreshold: 2,    // Fecha após 2 sucessos no estado HALF_OPEN
    }
  );
}

// Para monitorar:
const stats = this.circuitBreaker.getCircuitStats('google-maps-api');
console.log(`State: ${stats.state}, Failures: ${stats.failures}`);
*/
