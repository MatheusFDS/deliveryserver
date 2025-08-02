import {
  IsNumber,
  IsString,
  IsOptional,
  Min, // Para valores mínimos
  Max, // Para valores máximos (percentagem, etc.)
  IsPositive, // Para garantir valores positivos
  IsFQDN, // Para o domínio
  MaxLength, // Para strings
  IsNotEmpty, // Para domínio, se fornecido
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
  ) // Percentagem, pode ter 2 decimais
  @Min(0, {
    message: 'A percentagem mínima de entregas não pode ser negativa.',
  }) // Mínimo de 0%
  @Max(100, {
    message: 'A percentagem mínima de entregas não pode ser maior que 100.',
  }) // Máximo de 100%
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'O valor mínimo deve ser um número válido.' },
  ) // Valores monetários
  @IsPositive({ message: 'O valor mínimo deve ser um número positivo.' })
  @Min(0, { message: 'O valor mínimo não pode ser negativo.' }) // Permite 0 se for o caso
  @Max(99999999.99, {
    message:
      'O valor mínimo não pode ter mais de 8 dígitos inteiros (ex: 99.999.999,99).',
  }) // Limite para valores monetários
  minValue?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    {
      message: 'O número mínimo de pedidos deve ser um número inteiro válido.',
    },
  ) // Deve ser inteiro
  @Min(0, { message: 'O número mínimo de pedidos não pode ser negativo.' }) // Permite 0 se for o caso
  @Max(999999, {
    message: 'O número mínimo de pedidos não pode ser maior que 999.999.',
  }) // Limite para número de pedidos
  minOrders?: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 },
    { message: 'O peso mínimo deve ser um número válido.' },
  ) // Peso, pode ter 3 decimais
  @IsPositive({ message: 'O peso mínimo deve ser um número positivo.' })
  @Min(0, { message: 'O peso mínimo não pode ser negativo.' }) // Permite 0 se for o caso
  @Max(999999.999, {
    message:
      'O peso mínimo não pode ter mais de 6 dígitos inteiros (ex: 999.999,999).',
  }) // Limite para peso
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
}
