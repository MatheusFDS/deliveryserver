// src/infrastructure/cache/memory-cache.service.ts

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICacheService } from './cache.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class MemoryCacheService implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(MemoryCacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    // A configuração agora vem de um local central
    const cleanupIntervalMs =
      this.configService.get<number>('CACHE_CLEANUP_INTERVAL_MS') || 300000; // Default 5 mins

    this.cleanupInterval = setInterval(
      () => this.cleanExpiredEntries(),
      cleanupIntervalMs,
    );

    this.logger.log(
      `Cache cleanup job scheduled every ${cleanupIntervalMs}ms.`,
    );
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    // O valor é clonado para evitar mutações inesperadas no objeto cacheado.
    return JSON.parse(JSON.stringify(entry.value));
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    // O valor é clonado para garantir que o cache não seja alterado por referência.
    const valueToStore = JSON.parse(JSON.stringify(value));
    this.cache.set(key, { value: valueToStore, expiresAt });
    this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
  }

  async del(key: string): Promise<void> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted for key: ${key}`);
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .sort()
      .map((key) => {
        const value = params[key];
        if (typeof value === 'object' && value !== null) {
          return `${key}:${JSON.stringify(value)}`;
        }
        return `${key}:${String(value)}`;
      })
      .join('|');

    const encodedParams = Buffer.from(paramString).toString('base64');
    return `${prefix}:${encodedParams}`;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.log('Memory cache cleared.');
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [cacheKey, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(cacheKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} expired cache entries.`);
    }
  }
}
