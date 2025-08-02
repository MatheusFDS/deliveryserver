import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';

export class OrderDto {
  @IsUUID('4', {
    message: 'O ID do pedido deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do pedido é obrigatório.' })
  id: string;

  @IsString({ message: 'O nome do cliente deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório.' })
  @MaxLength(200, {
    message: 'O nome do cliente não pode ter mais de 200 caracteres.',
  })
  cliente: string;

  @IsString({ message: 'O número do pedido deve ser uma string.' })
  @IsNotEmpty({ message: 'O número do pedido é obrigatório.' })
  @MaxLength(50, {
    message: 'O número do pedido não pode ter mais de 50 caracteres.',
  })
  numero: string;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: 'A ordem de classificação deve ser um número inteiro válido.' },
  )
  @Min(0, { message: 'A ordem de classificação não pode ser negativa.' })
  sorting?: number;
}
