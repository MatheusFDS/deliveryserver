import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  minOrders?: number;

  @IsOptional()
  @IsNumber()
  minPeso?: number;

  @IsOptional()
  @IsString()
  domain?: string;
}
