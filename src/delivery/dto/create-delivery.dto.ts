// Proposta para: src/delivery/dto/create-delivery.dto.ts (Backend)
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID, // Adicionar para validação de UUID
  MaxLength,
  Min, // Adicionar para limite de caracteres
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderReferenceDto {
  @IsUUID('4', {
    message: 'O ID do pedido deve ser um UUID válido (versão 4).',
  }) // Força que seja um UUID v4
  @IsNotEmpty({ message: 'O ID do pedido não pode estar vazio.' })
  id: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: 'A ordem de classificação deve ser um número inteiro válido.' },
  ) // Deve ser um número inteiro
  @IsOptional()
  @Min(0, { message: 'A ordem de classificação não pode ser negativa.' }) // Permite 0 ou valores positivos
  sorting?: number;
}

export class CreateDeliveryDto {
  @IsUUID('4', {
    message: 'O ID do motorista deve ser um UUID válido (versão 4).',
  }) // Valida como UUID v4
  @IsNotEmpty({ message: 'O ID do motorista não pode estar vazio.' })
  motoristaId: string;

  @IsUUID('4', {
    message: 'O ID do veículo deve ser um UUID válido (versão 4).',
  }) // Valida como UUID v4
  @IsNotEmpty({ message: 'O ID do veículo não pode estar vazio.' })
  veiculoId: string;

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
  }) // Limite de tamanho razoável para observações
  observacao?: string;

  @IsOptional()
  @IsDateString(
    { strict: true },
    {
      message:
        'A data de início deve ser uma string de data ISO 8601 válida (ex: AAAA-MM-DDT00:00:00.000Z).',
    },
  ) // Força o formato ISO 8601
  dataInicio?: string;
}
