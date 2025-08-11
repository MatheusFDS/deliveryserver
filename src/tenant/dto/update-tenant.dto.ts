// src/tenant/dto/update-tenant.dto.ts

import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
  MaxLength,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { FreightType } from '@prisma/client';

export class UpdateTenantDto {
  @IsOptional()
  @IsString({ message: 'O nome do tenant deve ser uma string.' })
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString({ message: 'O endereço do tenant deve ser uma string.' })
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsNumber(
    {},
    { message: 'A porcentagem mínima de entrega deve ser numérica.' },
  )
  @Min(0)
  @Max(100)
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O valor mínimo deve ser numérico.' })
  @IsPositive()
  minValue?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O número mínimo de pedidos deve ser numérico.' })
  @Min(0)
  minOrders?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O peso mínimo deve ser numérico.' })
  @IsPositive()
  minPeso?: number;

  @IsOptional()
  @IsString({ message: 'O domínio do tenant deve ser uma string.' })
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @IsString({ message: 'O domínio mobile do tenant deve ser uma string.' })
  @MaxLength(255)
  mobileDomain?: string;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;

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
