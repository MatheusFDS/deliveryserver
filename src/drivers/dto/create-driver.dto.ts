export class CreateDriverDto {
  name: string;
  license: string;
  cpf: string;
  userId?: string; // ID do usuário relacionado (opcional)
}
