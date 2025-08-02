// update-driver.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
// Não é necessário importar individualmente IsString, etc., pois PartialType herda as validações

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  // Todos os campos (name, license, cpf, userId) são automaticamente marcados como opcionais
  // pelo PartialType.
  // Se qualquer um desses campos for fornecido na requisição de atualização,
  // ele será validado automaticamente de acordo com as regras que definimos em CreateDriverDto.
}
