// src/tenant/dto/create-tenant.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEnum,
  IsPositive,
} from 'class-validator';
import { FreightType } from '@prisma/client';

export class CreateTenantDto {
  @IsString({ message: 'O nome do tenant deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do tenant é obrigatório.' })
  @MaxLength(100, {
    message: 'O nome do tenant não pode ter mais de 100 caracteres.',
  })
  readonly name: string;

  @IsOptional()
  @IsString({ message: 'O endereço do tenant deve ser uma string.' })
  @MaxLength(255, {
    message: 'O endereço do tenant não pode ter mais de 255 caracteres.',
  })
  readonly address?: string;

  @IsOptional()
  @IsString({ message: 'O domínio do tenant deve ser uma string.' })
  @MaxLength(255)
  readonly domain?: string;

  @IsOptional()
  @IsString({ message: 'O domínio mobile do tenant deve ser uma string.' })
  @MaxLength(255)
  readonly mobileDomain?: string;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;

  @IsOptional()
  @IsNumber(
    {},
    { message: 'A porcentagem mínima de entrega deve ser numérica.' },
  )
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O valor mínimo deve ser numérico.' })
  minValue?: number;

  @IsOptional()
  @IsInt({ message: 'O número mínimo de pedidos deve ser um inteiro.' })
  minOrders?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O peso mínimo deve ser numérico.' })
  minPeso?: number;

  // --- NOVOS CAMPOS ADICIONADOS ---

  @IsOptional()
  @IsEnum(FreightType, {
    message:
      'O tipo de frete deve ser um dos valores válidos: DIRECTION_AND_CATEGORY, DIRECTION_AND_DELIVERY_FEE, DISTANCE_BASED.',
  })
  freightType?: FreightType;

  @IsOptional()
  @IsNumber({}, { message: 'O valor por km deve ser um número.' })
  @IsPositive({ message: 'O valor por km deve ser um número positivo.' })
  pricePerKm?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O valor por entrega deve ser um número.' })
  @IsPositive({ message: 'O valor por entrega deve ser um número positivo.' })
  pricePerDelivery?: number;
}
