import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  motoristaId: string;

  @IsUUID()
  @IsOptional()
  deliveryId?: string;
}
