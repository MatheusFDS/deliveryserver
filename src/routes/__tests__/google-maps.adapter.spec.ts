// =============================================================================
// EXEMPLO DE TESTE UNITÁRIO
// =============================================================================
// src/routes/__tests__/google-maps.adapter.spec.ts

/*
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleMapsAdapter } from '../adapters/google-maps.adapter.refactored';
import { CacheService } from '../services/cache.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { RetryService } from '../services/retry.service';

describe('GoogleMapsAdapter', () => {
  let adapter: GoogleMapsAdapter;
  let cacheService: jest.Mocked<CacheService>;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;
  let retryService: jest.Mocked<RetryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleMapsAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GOOGLE_MAPS_API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            generateKey: jest.fn(),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: RetryService,
          useValue: {
            executeWithRetry: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<GoogleMapsAdapter>(GoogleMapsAdapter);
    cacheService = module.get(CacheService);
    circuitBreaker = module.get(CircuitBreakerService);
    retryService = module.get(RetryService);
  });

  describe('geocodeAddresses', () => {
    it('should return cached results when available', async () => {
      const mockResult = {
        originalAddress: 'Test Address',
        formattedAddress: 'Test Address, Brazil',
        lat: -23.5505,
        lng: -46.6333,
        success: true,
      };

      cacheService.get.mockResolvedValue(mockResult);
      cacheService.generateKey.mockReturnValue('test-cache-key');

      const result = await adapter.geocodeAddresses(['Test Address']);

      expect(result).toEqual([mockResult]);
      expect(cacheService.get).toHaveBeenCalledWith('test-cache-key');
    });

    it('should handle API errors gracefully', async () => {
      cacheService.get.mockResolvedValue(null);
      circuitBreaker.execute.mockImplementation((name, operation) => operation());
      retryService.executeWithRetry.mockRejectedValue(new Error('API Error'));

      const result = await adapter.geocodeAddresses(['Invalid Address']);

      expect(result[0].success).toBe(false);
      expect(result[0].error).toBeDefined();
    });
  });
});
*/
