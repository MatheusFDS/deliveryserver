// src/users/dto/invite-user.dto.ts

import { IsEmail, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail({}, { message: 'O email deve ser um endereço de e-mail válido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  @MaxLength(255, { message: 'O email não pode ter mais de 255 caracteres.' })
  email: string;

  @IsUUID('4', {
    message: 'O ID da função (role) deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID da função (role) é obrigatório.' })
  roleId: string;
}
