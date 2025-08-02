// Conteúdo para: src/delivery/dto/rejeitar-roteiro.dto.ts

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejeitarRoteiroDto {
  @IsString({ message: 'O motivo da rejeição deve ser uma string.' })
  @IsNotEmpty({
    message: 'O motivo da rejeição é obrigatório e não pode estar vazio.',
  })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres.' })
  motivo: string;
}
