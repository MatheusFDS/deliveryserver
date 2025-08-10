// src/infrastructure/cache/cache.interface.ts

/**
 * Injection Token para o serviço de cache.
 * Usado para injetar a dependência sem acoplar à implementação concreta.
 */
export const CACHE_SERVICE = 'CacheService';

/**
 * Define o contrato que qualquer serviço de cache deve seguir na aplicação.
 */
export interface ICacheService {
  /**
   * Recupera um valor do cache.
   * @param key A chave do cache.
   * @returns O valor armazenado ou null se não encontrado/expirado.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Armazena um valor no cache com um tempo de vida (TTL).
   * @param key A chave do cache.
   * @param value O valor a ser armazenado.
   * @param ttl O tempo de vida em segundos.
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Remove um valor do cache.
   * @param key A chave do cache.
   */
  del(key: string): Promise<void>;

  /**
   * Gera uma chave de cache determinística a partir de um prefixo e parâmetros.
   * @param prefix O prefixo para a chave (ex: 'geocode').
   * @param params Um objeto com os parâmetros que compõem a chave.
   */
  generateKey(prefix: string, params: Record<string, any>): string;

  /**
   * Limpa todo o cache. Útil para testes.
   */
  clear(): Promise<void>;
}
