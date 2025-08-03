import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
  IsFQDN,
  MaxLength,
  IsNotEmpty,
  IsBoolean, // Adicionado
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString({ message: 'O nome do tenant deve ser uma string.' })
  @MaxLength(100, {
    message: 'O nome do tenant não pode ter mais de 100 caracteres.',
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'O endereço do tenant deve ser uma string.' })
  @MaxLength(255, {
    message: 'O endereço do tenant não pode ter mais de 255 caracteres.',
  })
  address?: string;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'A percentagem mínima de entregas deve ser um número válido.' },
  )
  @Min(0, {
    message: 'A percentagem mínima de entregas não pode ser negativa.',
  })
  @Max(100, {
    message: 'A percentagem mínima de entregas não pode ser maior que 100.',
  })
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'O valor mínimo deve ser um número válido.' },
  )
  @IsPositive({ message: 'O valor mínimo deve ser um número positivo.' })
  @Min(0, { message: 'O valor mínimo não pode ser negativo.' })
  @Max(99999999.99, {
    message:
      'O valor mínimo não pode ter mais de 8 dígitos inteiros (ex: 99.999.999,99).',
  })
  minValue?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    {
      message: 'O número mínimo de pedidos deve ser um número inteiro válido.',
    },
  )
  @Min(0, { message: 'O número mínimo de pedidos não pode ser negativo.' })
  @Max(999999, {
    message: 'O número mínimo de pedidos não pode ser maior que 999.999.',
  })
  minOrders?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 },
    { message: 'O peso mínimo deve ser um número válido.' },
  )
  @IsPositive({ message: 'O peso mínimo deve ser um número positivo.' })
  @Min(0, { message: 'O peso mínimo não pode ser negativo.' })
  @Max(999999.999, {
    message:
      'O peso mínimo não pode ter mais de 6 dígitos inteiros (ex: 999.999,999).',
  })
  minPeso?: number;

  @IsOptional()
  @IsString({ message: 'O domínio do tenant deve ser uma string.' })
  @IsNotEmpty({
    message: 'O domínio do tenant não pode estar vazio se fornecido.',
  })
  @IsFQDN(
    { require_tld: true, allow_underscores: false },
    {
      message:
        'O domínio do tenant deve ser um nome de domínio válido e completo.',
    },
  )
  @MaxLength(255, {
    message: 'O domínio do tenant não pode ter mais de 255 caracteres.',
  })
  domain?: string;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;
}
