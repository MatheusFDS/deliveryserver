// src/infrastructure/resilience/retry.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isGenericRetryableError } from '../errors/is-retryable.helper';
import { IRetryService, RetryConfig, RetryPredicate } from './retry.interface';

@Injectable()
export class RetryService implements IRetryService {
  private readonly logger = new Logger(RetryService.name);
  private defaultConfig: RetryConfig;

  constructor(private readonly configService: ConfigService) {
    this.defaultConfig = {
      maxAttempts: this.configService.get<number>('RETRY_MAX_ATTEMPTS', 3),
      baseDelay: this.configService.get<number>('RETRY_BASE_DELAY_MS', 1000),
      maxDelay: this.configService.get<number>('RETRY_MAX_DELAY_MS', 10000),
      backoffMultiplier: this.configService.get<number>(
        'RETRY_BACKOFF_MULTIPLIER',
        2,
      ),
      jitter: this.configService.get<boolean>('RETRY_JITTER_ENABLED', true),
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    operationName: string = 'unknown',
    customRetryPredicate?: RetryPredicate,
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.debug(
            `Retry attempt ${attempt}/${finalConfig.maxAttempts} for operation '${operationName}'`,
          );
        }
        return await operation();
      } catch (error) {
        lastError = error;

        const isCustomRetryable = customRetryPredicate
          ? customRetryPredicate(error)
          : false;

        if (
          attempt === finalConfig.maxAttempts ||
          !(isCustomRetryable || isGenericRetryableError(error))
        ) {
          this.logger.error(
            `Operation '${operationName}' failed after ${attempt} attempts.`,
            {
              name: error.name,
              message: error.message,
              status: error.response?.status,
            },
          );
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, finalConfig);
        this.logger.warn(
          `Operation '${operationName}' failed on attempt ${attempt}. Retrying in ${delay}ms...`,
          { message: error.message },
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    // Este ponto não deveria ser alcançado, mas por segurança:
    throw lastError!;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    if (config.jitter) {
      const jitter = delay * 0.2 * (Math.random() - 0.5); // +/- 10%
      delay += jitter;
    }

    return Math.round(delay);
  }
}
