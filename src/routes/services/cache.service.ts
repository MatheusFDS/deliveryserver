// src/routes/services/cache.service.ts

/**
 * CACHE SERVICE - VERSÃO IN-MEMORY
 *
 * Justificativa: Esta versão usa cache em memória local ao invés de Redis.
 * É ideal para desenvolvimento e pode ser facilmente trocada por Redis em produção
 * através de uma simples mudança no provider do módulo.
 *
 * Benefícios:
 * - Sem dependências externas
 * - Setup simples
 * - Performance excelente para cache local
 * - Interface compatível com versão Redis
 */

import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpa cache expirado a cada 5 minutos
    this.cleanupInterval = setInterval(
      () => {
        this.cleanExpiredEntries();
      },
      5 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return null;
      }

      // Verifica se expirou
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.logger.debug(`Cache expired for key: ${key}`);
        return null;
      }

      this.logger.debug(`Cache hit for key: ${key}`);
      return entry.value;
    } catch (error) {
      this.logger.warn(`Cache GET failed for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const expiresAt = Date.now() + ttl * 1000;

      this.cache.set(key, {
        value,
        expiresAt,
      });

      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.warn(`Cache SET failed for key ${key}:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.logger.debug(`Cache deleted for key: ${key}`);
      }
    } catch (error) {
      this.logger.warn(`Cache DEL failed for key ${key}:`, error.message);
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    // Cria uma chave determinística baseada nos parâmetros
    const paramString = Object.keys(params)
      .sort() // Garante ordem consistente
      .map((key) => {
        const value = params[key];
        if (typeof value === 'object') {
          return `${key}:${JSON.stringify(value)}`;
        }
        return `${key}:${value}`;
      })
      .join('|');

    // Usa base64 para criar uma chave mais limpa
    const encodedParams = Buffer.from(paramString).toString('base64');
    return `${prefix}:${encodedParams}`;
  }

  /**
   * Retorna estatísticas do cache para monitoramento
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Limpa entradas expiradas do cache
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [cacheKey, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(cacheKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Limpa todo o cache (útil para testes)
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Verifica se uma chave existe no cache (sem retornar o valor)
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Verifica se não expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// =============================================================================
// VERSÃO ALTERNATIVA COM REDIS (Para usar quando instalar o Redis)
// =============================================================================

/*
// src/routes/services/redis-cache.service.ts

import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Só conecta quando necessário
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Redis GET failed for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(`Redis SET failed for key ${key}:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL failed for key ${key}:`, error.message);
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${Buffer.from(paramString).toString('base64')}`;
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}

// Para usar Redis ao invés de cache em memória, 
// troque no routes.module.ts:
// providers: [
//   { provide: CacheService, useClass: RedisCacheService },
//   // ... outros providers
// ]
*/
