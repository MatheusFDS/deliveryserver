import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  model: string;

  @IsString()
  plate: string;

  @IsOptional()
  @IsNumber()
  cubagem?: number;

  @IsOptional()
  @IsNumber()
  pesoMaximo?: number;

  @IsUUID()
  driverId: string;

  @IsUUID()
  categoryId: string;
}
