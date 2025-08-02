import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength, // Para limites de string
  IsFQDN, // Para validar o domínio
} from 'class-validator';

export class CreateTenantDto {
  @IsString({ message: 'O nome do tenant deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do tenant é obrigatório.' })
  @MaxLength(100, {
    message: 'O nome do tenant não pode ter mais de 100 caracteres.',
  }) // Limite de tamanho razoável para o nome do tenant
  readonly name: string;

  @IsOptional()
  @IsString({ message: 'O endereço do tenant deve ser uma string.' })
  @MaxLength(255, {
    message: 'O endereço do tenant não pode ter mais de 255 caracteres.',
  }) // Limite de tamanho para endereço
  readonly address?: string;

  @IsOptional()
  @IsString({ message: 'O domínio do tenant deve ser uma string.' })
  @IsNotEmpty({
    message: 'O domínio do tenant não pode estar vazio se fornecido.',
  }) // Se fornecido, não pode ser vazio
  @IsFQDN(
    { require_tld: true, allow_underscores: false },
    {
      message:
        'O domínio do tenant deve ser um nome de domínio válido e completo.',
    },
  ) // Valida se é um FQDN (Full Qualified Domain Name)
  @MaxLength(255, {
    message: 'O domínio do tenant não pode ter mais de 255 caracteres.',
  }) // Limite de tamanho para o domínio
  readonly domain?: string;
}
