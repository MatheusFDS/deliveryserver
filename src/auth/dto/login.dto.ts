import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'O email deve ser um endereço de e-mail válido.' })
  email: string;

  @IsString({ message: 'A senha deve ser uma string.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }) // Exemplo de validação de tamanho
  password: string;

  @IsString({ message: 'O domínio deve ser uma string.' })
  @IsOptional() // Permite que o campo seja opcional
  domain?: string;
}
