// Proposta para: src/delivery/dto/update-delivery.dto.ts (Backend)
import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryDto, OrderReferenceDto } from './create-delivery.dto';
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsIn,
  ArrayMinSize, // Adicionar ArrayMinSize para o caso de `orders` ser atualizado
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '../../types/status.enum';

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {
  @IsOptional()
  @IsString({ message: 'O status deve ser uma string.' })
  @IsIn(
    [
      DeliveryStatus.A_LIBERAR,
      DeliveryStatus.INICIADO,
      DeliveryStatus.FINALIZADO,
      DeliveryStatus.REJEITADO,
    ],
    { message: 'O status fornecido não é válido.' },
  )
  status?: string;

  @IsOptional()
  @IsArray({ message: 'As ordens devem ser um array.' })
  @ArrayMinSize(1, {
    message:
      'É necessário ter pelo menos um pedido na entrega se a lista for atualizada.',
  }) // Garante que, se o array `orders` for enviado na atualização, ele não seja vazio.
  @ValidateNested({ each: true })
  @Type(() => OrderReferenceDto)
  orders?: OrderReferenceDto[];
}
