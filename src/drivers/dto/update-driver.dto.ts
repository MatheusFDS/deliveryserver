// update-driver.dto.ts
export class UpdateDriverDto {
  name?: string;
  license?: string;
  cpf?: string;
  userId?: string; // ID do usuário relacionado (opcional)
}
