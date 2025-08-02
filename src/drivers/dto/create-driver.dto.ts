import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Length, // Para CPF e CNH
  Matches, // Para formato de CPF e CNH
  IsOptional,
  IsUUID, // Para userId
} from 'class-validator';

export class CreateDriverDto {
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres.' }) // Limite de tamanho para o nome completo
  name: string;

  @IsString({ message: 'A licença (CNH) deve ser uma string.' })
  @IsNotEmpty({ message: 'A licença (CNH) é obrigatória.' })
  @Length(11, 11, {
    message: 'A licença (CNH) deve ter exatamente 11 dígitos.',
  }) // CNH no Brasil tem 11 dígitos
  @Matches(/^\d{11}$/, {
    message: 'A licença (CNH) deve conter apenas números.',
  }) // Garante que são 11 números
  license: string;

  @IsString({ message: 'O CPF deve ser uma string.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Length(11, 11, { message: 'O CPF deve ter exatamente 11 dígitos.' }) // CPF tem 11 dígitos
  @Matches(/^\d{11}$/, { message: 'O CPF deve conter apenas números.' }) // Garante que são 11 números
  // Opcional: Adicionar validação de CPF real (verificar dígitos verificadores).
  // Isso geralmente é feito em um serviço à parte ou com uma biblioteca mais específica.
  cpf: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'O ID do usuário relacionado deve ser um UUID válido (versão 4).',
  }) // Se for um UUID
  userId?: string; // ID do usuário relacionado (opcional)
}
