// src/delivery/dto/update-delivery.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryDto, OrderReferenceDto } from './create-delivery.dto';
import {
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
// CORREÇÃO: Importar o Enum diretamente do Prisma Client para garantir consistência.
import { DeliveryStatus } from '@prisma/client';

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {
  @IsOptional()
  // CORREÇÃO: Usando Object.values para validar dinamicamente contra o Enum do Prisma.
  @IsIn(Object.values(DeliveryStatus), {
    message: 'O status fornecido não é válido.',
  })
  // CORREÇÃO: O tipo do campo agora é o próprio Enum.
  status?: DeliveryStatus;

  @IsOptional()
  @IsArray({ message: 'As ordens devem ser um array.' })
  @ArrayMinSize(1, {
    message:
      'É necessário ter pelo menos um pedido na entrega se a lista for atualizada.',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderReferenceDto)
  orders?: OrderReferenceDto[];
}
