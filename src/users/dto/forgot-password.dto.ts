// users/dto/forgot-password.dto.ts

import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'O email deve ser um endereço de e-mail válido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  email: string;
}
