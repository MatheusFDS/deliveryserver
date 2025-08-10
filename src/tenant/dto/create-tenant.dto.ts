import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsNumber,
  IsInt,
} from 'class-validator';

export class CreateTenantDto {
  @IsString({ message: 'O nome do tenant deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do tenant é obrigatório.' })
  @MaxLength(100, {
    message: 'O nome do tenant não pode ter mais de 100 caracteres.',
  })
  readonly name: string;

  @IsOptional()
  @IsString({ message: 'O endereço do tenant deve ser uma string.' })
  @MaxLength(255, {
    message: 'O endereço do tenant não pode ter mais de 255 caracteres.',
  })
  readonly address?: string;

  @IsOptional()
  @IsString({ message: 'O domínio do tenant deve ser uma string.' })
  @IsNotEmpty({
    message: 'O domínio do tenant não pode estar vazio se fornecido.',
  })
  @MaxLength(255, {
    message: 'O domínio do tenant não pode ter mais de 255 caracteres.',
  })
  readonly domain?: string;

  @IsOptional()
  @IsString({ message: 'O domínio mobile do tenant deve ser uma string.' })
  @IsNotEmpty({
    message: 'O domínio mobile do tenant não pode estar vazio se fornecido.',
  })
  @MaxLength(255, {
    message: 'O domínio mobile do tenant não pode ter mais de 255 caracteres.',
  })
  readonly mobileDomain?: string;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um valor booleano.' })
  isActive?: boolean;

  @IsOptional()
  @IsNumber(
    {},
    { message: 'A porcentagem mínima de entrega deve ser numérica.' },
  )
  minDeliveryPercentage?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O valor mínimo deve ser numérico.' })
  minValue?: number;

  @IsOptional()
  @IsInt({ message: 'O número mínimo de pedidos deve ser um inteiro.' })
  minOrders?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O peso mínimo deve ser numérico.' })
  minPeso?: number;
}
