import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
  IsEmail,
  Min,
  IsPositive,
  IsIn,
} from 'class-validator';
// CORREÇÃO: Importando o Enum oficial do Prisma para validação
import { OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @IsString({ message: 'O número do pedido deve ser uma string.' })
  @IsNotEmpty({ message: 'O número do pedido é obrigatório.' })
  @MaxLength(50)
  numero: string;

  @IsDateString(
    { strict: true },
    { message: 'A data deve ser uma string de data ISO 8601 válida.' },
  )
  @IsNotEmpty({ message: 'A data é obrigatória.' })
  data: string;

  @IsUUID('4', { message: 'O ID do cliente deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do cliente é obrigatório.' })
  idCliente: string;

  @IsString({ message: 'O nome do cliente deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório.' })
  @MaxLength(200)
  cliente: string;

  @IsString({ message: 'O endereço deve ser uma string.' })
  @IsNotEmpty({ message: 'O endereço é obrigatório.' })
  @MaxLength(255)
  endereco: string;

  @IsString({ message: 'A cidade deve ser uma string.' })
  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  @MaxLength(100)
  cidade: string;

  @IsString({ message: 'A UF deve ser uma string.' })
  @IsNotEmpty({ message: 'A UF é obrigatória.' })
  @MaxLength(100)
  uf: string;

  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'O peso deve ser um número válido.' },
  )
  @IsPositive({ message: 'O peso deve ser um número positivo.' })
  @IsNotEmpty({ message: 'O peso é obrigatório.' })
  peso: number;

  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'O volume deve ser um número válido.' },
  )
  @IsPositive({ message: 'O volume deve ser um número positivo.' })
  @IsNotEmpty({ message: 'O volume é obrigatório.' })
  volume: number;

  @IsOptional()
  @IsString({ message: 'O prazo deve ser uma string.' })
  @MaxLength(50)
  prazo?: string;

  // CORREÇÃO: Campo agora é obrigatório, como no schema.prisma
  @IsString({ message: 'A prioridade deve ser uma string.' })
  @IsNotEmpty({ message: 'A prioridade é obrigatória.' })
  prioridade: string;

  // CORREÇÃO: Campo agora é obrigatório
  @IsString({ message: 'O telefone deve ser uma string.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  telefone: string;

  // CORREÇÃO: Campo agora é obrigatório
  @IsEmail({}, { message: 'O email deve ser um endereço de e-mail válido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  @MaxLength(255)
  email: string;

  @IsString({ message: 'O bairro deve ser uma string.' })
  @IsNotEmpty({ message: 'O bairro é obrigatório.' })
  @MaxLength(100)
  bairro: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O valor deve ser um número válido.' },
  )
  @IsPositive({ message: 'O valor deve ser um número positivo.' })
  @IsNotEmpty({ message: 'O valor é obrigatório.' })
  valor: number;

  @IsOptional()
  @IsString({ message: 'As instruções de entrega devem ser uma string.' })
  @MaxLength(1000)
  instrucoesEntrega?: string;

  // CORREÇÃO: Campo agora é obrigatório
  @IsString({ message: 'O nome do contato deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do contato é obrigatório.' })
  @MaxLength(200)
  nomeContato: string;

  @IsString({ message: 'O CPF/CNPJ deve ser uma string.' })
  @IsNotEmpty({ message: 'O CPF/CNPJ é obrigatório.' })
  @MaxLength(14)
  cpfCnpj: string;

  @IsString({ message: 'O CEP deve ser uma string.' })
  @IsNotEmpty({ message: 'O CEP é obrigatório.' })
  @MaxLength(8)
  cep: string;

  // O status é opcional na criação, pois o banco de dados já atribui um valor padrão ('SEM_ROTA').
  // A validação, se presente, usa o Enum do Prisma para consistência.
  @IsOptional()
  @IsIn(Object.values(OrderStatus), {
    message: 'O status inicial fornecido não é válido.',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsUUID('4')
  deliveryId?: string;

  @IsOptional()
  @IsNumber(
    {},
    { message: 'A ordem de classificação deve ser um número inteiro.' },
  )
  @Min(0)
  sorting?: number;
}
