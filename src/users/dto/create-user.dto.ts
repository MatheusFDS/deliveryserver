import {
  IsString,
  IsEmail,
  IsUUID,
  IsNotEmpty, // Para garantir que os campos não estejam vazios
  MinLength, // Para a complexidade da senha
  MaxLength, // Para email, nome, senha
  Matches, // Para a complexidade da senha
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'O email deve ser um endereço de e-mail válido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  @MaxLength(255, { message: 'O email não pode ter mais de 255 caracteres.' }) // Limite de tamanho para email
  email: string;

  @IsString({ message: 'A senha deve ser uma string.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, {
    message: 'A senha deve ter no mínimo 8 caracteres.',
  }) // Aumentado para 8 caracteres para maior segurança
  @MaxLength(64, {
    message: 'A senha não pode ter mais de 64 caracteres.',
  }) // Limite de tamanho para segurança
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/,
    {
      message:
        'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial.',
    },
  ) // Validação de complexidade da senha
  password: string;

  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres.' }) // Limite de tamanho para o nome completo
  name: string;

  @IsUUID('4', {
    message: 'O ID da função (role) deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID da função (role) é obrigatório.' })
  roleId: string;
}
