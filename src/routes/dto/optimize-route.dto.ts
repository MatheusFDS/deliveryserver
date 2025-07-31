// Arquivo: src/routes/dto/optimize-route.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLocationDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  cliente: string;

  @IsString()
  @IsNotEmpty()
  numero: string;
}

export class OptimizeRouteDto {
  @IsString()
  @IsNotEmpty()
  startingPoint: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Pelo menos um pedido é obrigatório' })
  @ArrayMaxSize(25, { message: 'Máximo de 25 pedidos por otimização' })
  @ValidateNested({ each: true })
  @Type(() => OrderLocationDto)
  orders: OrderLocationDto[];
}
