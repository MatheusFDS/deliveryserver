import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean({
    message: 'O campo isActive deve ser um booleano (verdadeiro ou falso).',
  })
  isActive?: boolean;
}
