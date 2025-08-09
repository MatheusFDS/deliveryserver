// src/routes/dto/routes-endpoints.dto.ts

/**
 * DTOs ESPECÍFICOS PARA CADA ENDPOINT
 *
 * Justificativa: DTOs específicos melhoram a documentação da API,
 * validação de dados e experiência do desenvolvedor.
 */

import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LatLng } from '../interfaces/route-optimization.interface';

// =========================================================================
// DTO PARA CALCULAR DISTÂNCIA
// =========================================================================

export class CalculateDistanceDto {
  @ApiProperty({
    description: 'Ponto de origem (endereço ou coordenadas)',
    example: 'Rua das Flores, 123, São Paulo, SP',
  })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({
    description: 'Ponto de destino (endereço ou coordenadas)',
    example: 'Av. Paulista, 1000, São Paulo, SP',
  })
  @IsString()
  @IsNotEmpty()
  destination: string;
}

// =========================================================================
// DTO PARA GEOCODING
// =========================================================================

export class GeocodeAddressesDto {
  @ApiProperty({
    description: 'Lista de endereços para geocodificar',
    example: [
      'Rua das Flores, 123, São Paulo, SP',
      'Av. Paulista, 1000, São Paulo, SP',
      'Rua Oscar Freire, 500, São Paulo, SP',
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pelo menos um endereço é obrigatório' })
  @ArrayMaxSize(100, { message: 'Máximo de 100 endereços por consulta' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  addresses: string[];
}

// =========================================================================
// DTO PARA ROTA INTERATIVA
// =========================================================================

export class LatLngDto implements LatLng {
  @ApiProperty({
    description: 'Latitude',
    example: -23.5505,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    example: -46.6333,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class CalculateRouteDto {
  @ApiProperty({
    description: 'Coordenadas do ponto de origem',
    type: LatLngDto,
  })
  @ValidateNested()
  @Type(() => LatLngDto)
  origin: LatLng;

  @ApiProperty({
    description: 'Coordenadas do ponto de destino',
    type: LatLngDto,
  })
  @ValidateNested()
  @Type(() => LatLngDto)
  destination: LatLng;

  @ApiPropertyOptional({
    description: 'Lista de waypoints (paradas intermediárias)',
    type: [LatLngDto],
    maxItems: 23,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(23, { message: 'Máximo de 23 waypoints permitidos' })
  @ValidateNested({ each: true })
  @Type(() => LatLngDto)
  waypoints?: LatLng[];
}

// =========================================================================
// DTO PARA MAPA ESTÁTICO
// =========================================================================

export class MarkerDto {
  @ApiProperty({
    description: 'Coordenadas do marcador',
    type: LatLngDto,
  })
  @ValidateNested()
  @Type(() => LatLngDto)
  location: LatLng;

  @ApiPropertyOptional({
    description: 'Label do marcador',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Cor do marcador',
    example: 'red',
    enum: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'],
  })
  @IsOptional()
  @IsString()
  color?: string;
}

export class GenerateStaticMapDto {
  @ApiProperty({
    description: 'Lista de marcadores no mapa',
    type: [MarkerDto],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pelo menos um marcador é obrigatório' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 marcadores permitidos' })
  @ValidateNested({ each: true })
  @Type(() => MarkerDto)
  markers: MarkerDto[];

  @ApiPropertyOptional({
    description: 'Polyline codificada para desenhar rota',
    example: 'u{~vFvyys@fS]',
  })
  @IsOptional()
  @IsString()
  polyline?: string;

  @ApiPropertyOptional({
    description: 'Tamanho da imagem',
    example: '600x400',
    pattern: '\\d+x\\d+',
  })
  @IsOptional()
  @IsString()
  size?: string;
}
