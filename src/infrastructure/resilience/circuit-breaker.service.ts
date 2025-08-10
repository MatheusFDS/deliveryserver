// src/infrastructure/resilience/circuit-breaker.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '../../routes/exceptions/maps.exceptions';
import {
  CircuitBreakerConfig,
  CircuitState,
  ICircuitBreakerService,
} from './circuit-breaker.interface';

interface CircuitInfo {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  config: CircuitBreakerConfig;
}

@Injectable()
export class CircuitBreakerService implements ICircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, CircuitInfo>();
  private defaultConfig: CircuitBreakerConfig;

  constructor(private readonly configService: ConfigService) {
    this.defaultConfig = {
      failureThreshold: this.configService.get<number>(
        'CB_FAILURE_THRESHOLD',
        5,
      ),
      resetTimeout: this.configService.get<number>(
        'CB_RESET_TIMEOUT_MS',
        60000,
      ),
      monitoringPeriod: this.configService.get<number>(
        'CB_MONITORING_PERIOD_MS',
        300000,
      ),
      successThreshold: this.configService.get<number>(
        'CB_SUCCESS_THRESHOLD',
        3,
      ),
    };
  }

  private getCircuit(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitInfo {
    if (!this.circuits.has(name)) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        config: circuitConfig,
      });
      this.logger.log(`Circuit breaker '${name}' created.`);
    }
    return this.circuits.get(name)!;
  }

  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuit = this.getCircuit(circuitName, config);
    this.updateCircuitState(circuit);

    if (circuit.state === CircuitState.OPEN) {
      this.logger.warn(`Circuit '${circuitName}' is OPEN, rejecting request.`);
      throw new ServiceUnavailableException(
        `Service '${circuitName}' is temporarily unavailable. Circuit breaker is active.`,
      );
    }

    try {
      const result = await operation();
      this.onSuccess(circuit, circuitName);
      return result;
    } catch (error) {
      this.onFailure(circuit, circuitName, error);
      throw error;
    }
  }

  private updateCircuitState(circuit: CircuitInfo): void {
    if (
      circuit.state === CircuitState.OPEN &&
      Date.now() >= circuit.nextAttemptTime
    ) {
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
      this.logger.log(
        `Circuit '${circuit.config.resetTimeout}' changed to HALF_OPEN.`,
      );
    } else if (
      circuit.lastFailureTime > 0 &&
      Date.now() - circuit.lastFailureTime > circuit.config.monitoringPeriod
    ) {
      circuit.failures = 0;
    }
  }

  private onSuccess(circuit: CircuitInfo, circuitName: string): void {
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= circuit.config.successThreshold!) {
        this.resetCircuit(circuit, circuitName);
      }
    } else {
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  private onFailure(
    circuit: CircuitInfo,
    circuitName: string,
    error: any,
  ): void {
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (
      circuit.state === CircuitState.HALF_OPEN ||
      circuit.failures >= circuit.config.failureThreshold
    ) {
      this.tripCircuit(circuit, circuitName);
    }

    // CORREÇÃO APLICADA AQUI: A variável 'error' agora é usada no log.
    this.logger.warn(
      `Circuit '${circuitName}' failure recorded: ${error.message}`,
      {
        totalFailures: circuit.failures,
        errorName: error.name,
      },
    );
  }

  private tripCircuit(circuit: CircuitInfo, circuitName: string): void {
    circuit.state = CircuitState.OPEN;
    circuit.nextAttemptTime = Date.now() + circuit.config.resetTimeout;
    this.logger.error(
      `Circuit '${circuitName}' has been OPENED. Will attempt reset after ${circuit.config.resetTimeout}ms.`,
    );
  }

  private resetCircuit(circuit: CircuitInfo, circuitName: string): void {
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    this.logger.log(
      `Circuit '${circuitName}' has been CLOSED after successful recovery.`,
    );
  }
}
