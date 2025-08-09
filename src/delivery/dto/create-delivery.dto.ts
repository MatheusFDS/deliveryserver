// src/delivery/dto/create-delivery.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderReferenceDto {
  @IsUUID('4', {
    message: 'O ID do pedido deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do pedido não pode estar vazio.' })
  id: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: 'A ordem de classificação deve ser um número inteiro válido.' },
  )
  @IsOptional()
  @Min(0, { message: 'A ordem de classificação não pode ser negativa.' })
  sorting?: number;
}

export class CreateDeliveryDto {
  // CORREÇÃO: Renomeado de motoristaId para o padrão driverId
  @IsUUID('4', {
    message: 'O ID do motorista deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do motorista não pode estar vazio.' })
  driverId: string;

  // CORREÇÃO: Renomeado de veiculoId para o padrão vehicleId
  @IsUUID('4', {
    message: 'O ID do veículo deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do veículo não pode estar vazio.' })
  vehicleId: string;

  @IsArray({ message: 'As ordens devem ser um array.' })
  @ArrayMinSize(1, {
    message: 'É necessário ter pelo menos um pedido na entrega.',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderReferenceDto)
  orders: OrderReferenceDto[];

  @IsOptional()
  @IsString({ message: 'A observação deve ser uma string.' })
  @MaxLength(1000, {
    message: 'A observação não pode ter mais de 1000 caracteres.',
  })
  observacao?: string;

  @IsOptional()
  @IsDateString(
    { strict: true },
    {
      message:
        'A data de início deve ser uma string de data ISO 8601 válida (ex: AAAA-MM-DDT00:00:00.000Z).',
    },
  )
  dataInicio?: string;
}
