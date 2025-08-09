// src/routes/dto/response.dto.ts

/**
 * RESPONSE DTOs PARA SWAGGER DOCUMENTATION
 *
 * Justificativa: Define os tipos de resposta para documentação automática
 * da API com Swagger, melhorando a experiência do desenvolvedor.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OptimizedRouteResult,
  DistanceResult,
  GeocodeResult,
  InteractiveRouteResult,
  StaticMapResult,
  Waypoint,
} from '../interfaces/route-optimization.interface';

// =========================================================================
// RESPOSTA PADRÃO DA API
// =========================================================================

export class StandardApiResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensagem descritiva do resultado',
    example: 'Operação realizada com sucesso',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Dados retornados pela operação',
  })
  data?: any;

  @ApiPropertyOptional({
    description: 'Metadados adicionais sobre a operação',
  })
  meta?: {
    requestId?: string;
    [key: string]: any;
  };

  @ApiPropertyOptional({
    description:
      'Informações sobre erro (presente apenas quando success = false)',
  })
  error?: {
    code?: string;
    provider?: string;
    isRetryable?: boolean;
    requestId?: string;
    [key: string]: any;
  };
}

// =========================================================================
// RESPOSTAS ESPECÍFICAS PARA CADA ENDPOINT
// =========================================================================

// Waypoint para documentação
class WaypointDto implements Waypoint {
  @ApiProperty({ example: 'order_123' })
  id: string;

  @ApiProperty({ example: 'Rua das Flores, 123, São Paulo, SP' })
  address: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  clientName?: string;

  @ApiPropertyOptional({ example: 'PED-2023-001' })
  orderNumber?: string;
}

class OptimizedWaypointDto extends WaypointDto {
  @ApiProperty({
    description: 'Ordem na rota otimizada',
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Distância do ponto anterior em metros',
    example: 1250,
  })
  distanceFromPreviousInMeters: number;

  @ApiProperty({
    description: 'Tempo do ponto anterior em segundos',
    example: 300,
  })
  durationFromPreviousInSeconds: number;
}

class OptimizedRouteResultDto implements OptimizedRouteResult {
  @ApiProperty({
    description: 'Lista de waypoints na ordem otimizada',
    type: [OptimizedWaypointDto],
  })
  optimizedWaypoints: OptimizedWaypointDto[];

  @ApiProperty({
    description: 'Distância total da rota em metros',
    example: 15000,
  })
  totalDistanceInMeters: number;

  @ApiProperty({
    description: 'Tempo total da rota em segundos',
    example: 3600,
  })
  totalDurationInSeconds: number;

  @ApiProperty({
    description: 'Polyline codificada da rota',
    example: 'u{~vFvyys@fS]',
  })
  polyline: string;

  @ApiProperty({
    description: 'Indica se a rota possui pedágios',
    example: false,
  })
  hasTolls: boolean;

  @ApiPropertyOptional({
    description: 'URL do mapa estático da rota',
    example: 'https://maps.googleapis.com/maps/api/staticmap?...',
  })
  mapUrl?: string;
}

// =========================================================================
// RESPOSTA DE OTIMIZAÇÃO DE ROTA
// =========================================================================

export class OptimizedRouteResponse extends StandardApiResponse {
  @ApiProperty({
    description: 'Dados da rota otimizada',
    type: OptimizedRouteResultDto,
  })
  data: OptimizedRouteResultDto;

  @ApiProperty({
    description: 'Metadados da operação',
    example: {
      requestId: 'req_1703123456789_abc123',
      totalWaypoints: 5,
      totalDistance: 15000,
      totalDuration: 3600,
    },
  })
  meta: {
    requestId: string;
    totalWaypoints: number;
    totalDistance: number;
    totalDuration: number;
  };
}

// =========================================================================
// RESPOSTA DE CÁLCULO DE DISTÂNCIA
// =========================================================================

class DistanceResultDto implements DistanceResult {
  @ApiProperty({
    description: 'Distância em metros',
    example: 5000,
  })
  distanceInMeters: number;

  @ApiProperty({
    description: 'Duração em segundos',
    example: 900,
  })
  durationInSeconds: number;
}

export class DistanceResponse extends StandardApiResponse {
  @ApiProperty({
    description: 'Dados da distância calculada',
    type: DistanceResultDto,
  })
  data: DistanceResultDto;

  @ApiProperty({
    description: 'Metadados da operação',
    example: {
      requestId: 'req_1703123456789_abc123',
      distanceKm: '5.00',
      durationMinutes: 15,
    },
  })
  meta: {
    requestId: string;
    distanceKm: string;
    durationMinutes: number;
  };
}

// =========================================================================
// RESPOSTA DE GEOCODING
// =========================================================================

class GeocodeResultDto implements GeocodeResult {
  @ApiProperty({
    description: 'Endereço original fornecido',
    example: 'Rua das Flores, 123',
  })
  originalAddress: string;

  @ApiProperty({
    description: 'Endereço formatado retornado pela API',
    example: 'Rua das Flores, 123 - Centro, São Paulo - SP, Brasil',
  })
  formattedAddress: string;

  @ApiProperty({
    description: 'Latitude',
    example: -23.5505,
  })
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    example: -46.6333,
  })
  lng: number;

  @ApiProperty({
    description: 'Indica se a geocodificação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Mensagem de erro (presente apenas quando success = false)',
    example: 'ZERO_RESULTS',
  })
  error?: string;
}

export class GeocodeResponse extends StandardApiResponse {
  @ApiProperty({
    description: 'Lista de resultados da geocodificação',
    type: [GeocodeResultDto],
  })
  data: GeocodeResultDto[];

  @ApiProperty({
    description: 'Metadados da operação',
    example: {
      requestId: 'req_1703123456789_abc123',
      totalAddresses: 3,
      successfulGeocodings: 2,
      successRate: '66.7%',
    },
  })
  meta: {
    requestId: string;
    totalAddresses: number;
    successfulGeocodings: number;
    successRate: string;
  };
}

// =========================================================================
// RESPOSTA DE ROTA INTERATIVA
// =========================================================================

class RouteLegDto {
  @ApiProperty({
    description: 'Endereço de início do trecho',
    example: 'Rua A, 100, São Paulo, SP',
  })
  startAddress: string;

  @ApiProperty({
    description: 'Endereço de fim do trecho',
    example: 'Rua B, 200, São Paulo, SP',
  })
  endAddress: string;

  @ApiProperty({
    description: 'Distância do trecho em metros',
    example: 2500,
  })
  distanceInMeters: number;

  @ApiProperty({
    description: 'Duração do trecho em segundos',
    example: 480,
  })
  durationInSeconds: number;
}

class InteractiveRouteResultDto implements InteractiveRouteResult {
  @ApiProperty({
    description: 'Distância total em metros',
    example: 8500,
  })
  totalDistanceInMeters: number;

  @ApiProperty({
    description: 'Duração total em segundos',
    example: 1800,
  })
  totalDurationInSeconds: number;

  @ApiProperty({
    description: 'Polyline codificada da rota',
    example: 'u{~vFvyys@fS]',
  })
  polyline: string;

  @ApiProperty({
    description: 'Lista de trechos da rota',
    type: [RouteLegDto],
  })
  legs: RouteLegDto[];
}

export class InteractiveRouteResponse extends StandardApiResponse {
  @ApiProperty({
    description: 'Dados da rota interativa',
    type: InteractiveRouteResultDto,
  })
  data: InteractiveRouteResultDto;

  @ApiProperty({
    description: 'Metadados da operação',
    example: {
      requestId: 'req_1703123456789_abc123',
      totalLegs: 2,
      totalDistanceKm: '8.50',
      totalDurationMinutes: 30,
    },
  })
  meta: {
    requestId: string;
    totalLegs: number;
    totalDistanceKm: string;
    totalDurationMinutes: number;
  };
}

// =========================================================================
// RESPOSTA DE MAPA ESTÁTICO
// =========================================================================

class StaticMapResultDto implements StaticMapResult {
  @ApiProperty({
    description: 'URL do mapa estático gerado',
    example: 'https://maps.googleapis.com/maps/api/staticmap?size=600x400&...',
  })
  mapUrl: string;
}

export class StaticMapResponse extends StandardApiResponse {
  @ApiProperty({
    description: 'Dados do mapa estático',
    type: StaticMapResultDto,
  })
  data: StaticMapResultDto;

  @ApiProperty({
    description: 'Metadados da operação',
    example: {
      requestId: 'req_1703123456789_abc123',
      markersCount: 3,
    },
  })
  meta: {
    requestId: string;
    markersCount: number;
  };
}
