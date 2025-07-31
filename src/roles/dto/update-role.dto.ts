// src/roles/dto/update-role.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsOptional, IsBoolean } from 'class-validator'; // Adicionado IsBoolean se 'isPlatformRole' puder ser atualizado

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsOptional()
  @IsBoolean()
  isPlatformRole?: boolean; // Se a role pode mudar de tenant para plataforma ou vice-versa
}
