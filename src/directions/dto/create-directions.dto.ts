import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDirectionsDto {
  @IsNotEmpty()
  @IsString()
  rangeInicio: string;

  @IsNotEmpty()
  @IsString()
  rangeFim: string;

  @IsNotEmpty()
  @IsNumber()
  valorDirecao: number;

  @IsNotEmpty()
  @IsString()
  regiao: string;
}
