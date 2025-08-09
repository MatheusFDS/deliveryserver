// src/routes/config/maps.config.ts
// =========================================
// Centraliza todas as configurações relacionadas a mapas
export interface MapsConfig {
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  maxBatchSize: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

export class MapsConfigFactory {
  static create(provider: 'google' | 'mapbox' | 'here'): MapsConfig {
    const baseConfig = {
      timeout: parseInt(process.env.MAPS_API_TIMEOUT) || 10000,
      retryAttempts: parseInt(process.env.MAPS_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.MAPS_RETRY_DELAY) || 1000,
      maxBatchSize: parseInt(process.env.MAPS_MAX_BATCH_SIZE) || 25,
      cacheEnabled: process.env.MAPS_CACHE_ENABLED === 'true',
      cacheTtl: parseInt(process.env.MAPS_CACHE_TTL) || 3600,
      rateLimit: {
        maxRequests: parseInt(process.env.MAPS_RATE_LIMIT_MAX) || 100,
        windowMs: parseInt(process.env.MAPS_RATE_LIMIT_WINDOW) || 60000,
      },
    };

    switch (provider) {
      case 'google':
        return {
          ...baseConfig,
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        };
      case 'mapbox':
        return {
          ...baseConfig,
          apiKey: process.env.MAPBOX_API_KEY,
        };
      case 'here':
        return {
          ...baseConfig,
          apiKey: process.env.HERE_API_KEY,
        };
      default:
        throw new Error(`Provedor de mapas não suportado: ${provider}`);
    }
  }
}
