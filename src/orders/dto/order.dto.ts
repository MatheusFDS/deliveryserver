import { IsUUID, IsString, IsOptional, IsNumber } from 'class-validator';

export class OrderDto {
  @IsUUID()
  id: string;

  @IsString()
  cliente: string;

  @IsString()
  numero: string;

  @IsOptional()
  @IsNumber()
  sorting?: number;
}
