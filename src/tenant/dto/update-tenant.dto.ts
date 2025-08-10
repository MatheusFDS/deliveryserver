import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
  MaxLength,
  IsNotEmpty,
  IsBoolean,
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
    {},
    { message: 'A porcentagem mínima de entrega deve ser numérica.' },
  )
  @Min(0, { message: 'A porcentagem mínima de entrega não pode ser negativa.' })
  @Max(100, {
    message: 'A porcentagem mínima de entrega não pode ser maior que 100.',
  })
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O valor mínimo deve ser numérico.' })
  @IsPositive({ message: 'O valor mínimo deve ser positivo.' })
  @Max(99999999.99, {
    message: 'O valor mínimo não pode exceder 99.999.999,99.',
  })
  minValue?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O número mínimo de pedidos deve ser numérico.' })
  @Min(0, { message: 'O número mínimo de pedidos não pode ser negativo.' })
  @Max(999999, {
    message: 'O número mínimo de pedidos não pode ser maior que 999.999.',
  })
  minOrders?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O peso mínimo deve ser numérico.' })
  @IsPositive({ message: 'O peso mínimo deve ser positivo.' })
  @Max(999999.999, {
    message: 'O peso mínimo não pode exceder 999.999,999.',
  })
  minPeso?: number;

  @IsOptional()
  @IsString({ message: 'O domínio do tenant deve ser uma string.' })
  @IsNotEmpty({
    message: 'O domínio do tenant não pode estar vazio se fornecido.',
  })
  @MaxLength(255, {
    message: 'O domínio do tenant não pode ter mais de 255 caracteres.',
  })
  domain?: string;

  @IsOptional()
  @IsString({ message: 'O domínio mobile do tenant deve ser uma string.' })
  @IsNotEmpty({
    message: 'O domínio mobile do tenant não pode estar vazio se fornecido.',
  })
  @MaxLength(255, {
    message: 'O domínio mobile do tenant não pode ter mais de 255 caracteres.',
  })
  mobileDomain?: string;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;
}
