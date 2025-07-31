// Proposta para: src/delivery/dto/create-delivery.dto.ts (Backend)
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsNumber,
  IsDateString, // Adicionar para validação de data
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderReferenceDto {
  // Mantido como na sua definição original
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @IsOptional()
  sorting?: number;
}

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  motoristaId: string;

  @IsString()
  @IsNotEmpty()
  veiculoId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderReferenceDto)
  orders: OrderReferenceDto[];

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsOptional()
  @IsDateString() // Adicionado para permitir string no formato de data ISO
  dataInicio?: string; // Campo adicionado
}
