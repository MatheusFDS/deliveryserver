import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional } from 'class-validator'; // Adicionar IsBoolean

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional() // Opcional, pois pode não ser sempre fornecido na atualização
  @IsBoolean({
    message: 'O campo isActive deve ser um booleano (verdadeiro ou falso).',
  })
  isActive?: boolean; // Alterado para opcional com '?'
}
