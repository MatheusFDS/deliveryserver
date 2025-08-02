import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength, // Para limites de string
  Length, // Para CPF/CNPJ, CEP
  Matches, // Para CPF/CNPJ, Telefone
  IsEmail, // Para email
  Min, // Para peso, valor
  Max, // Para peso, valor
  IsPositive, // Para peso, valor
  IsIn, // Para prioridade, status
} from 'class-validator';

// Removendo a definição de estados brasileiros, pois não será mais usada para validação de UF
// const BRAZILIAN_STATES = [...];

// Opcional: Para Prioridade, se for um conjunto fixo de valores
export enum OrderPriority {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

// Opcional: Para Status inicial, se for um conjunto fixo.
// Se o status for dinâmico e definido por outros processos, pode ser menos restritivo.
export enum OrderInitialStatus {
  CRIADO = 'CRIADO',
  PENDENTE = 'PENDENTE',
  EM_PROCESSAMENTO = 'EM_PROCESSAMENTO',
}

export class CreateOrderDto {
  @IsString({ message: 'O número do pedido deve ser uma string.' })
  @IsNotEmpty({ message: 'O número do pedido é obrigatório.' })
  @MaxLength(50, {
    message: 'O número do pedido não pode ter mais de 50 caracteres.',
  })
  numero: string;

  @IsDateString(
    { strict: true },
    {
      message:
        'A data deve ser uma string de data ISO 8601 válida (ex: AAAA-MM-DDT00:00:00.000Z).',
    },
  )
  @IsNotEmpty({ message: 'A data é obrigatório.' })
  data: string;

  @IsUUID('4', {
    message: 'O ID do cliente deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do cliente é obrigatório.' })
  idCliente: string;

  @IsString({ message: 'O nome do cliente deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório.' })
  @MaxLength(200, {
    message: 'O nome do cliente não pode ter mais de 200 caracteres.',
  })
  cliente: string;

  @IsString({ message: 'O endereço deve ser uma string.' })
  @IsNotEmpty({ message: 'O endereço é obrigatório.' })
  @MaxLength(255, {
    message: 'O endereço não pode ter mais de 255 caracteres.',
  })
  endereco: string;

  @IsString({ message: 'A cidade deve ser uma string.' })
  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  @MaxLength(100, { message: 'A cidade não pode ter mais de 100 caracteres.' })
  cidade: string;

  @IsString({ message: 'A UF/Província deve ser uma string.' }) // Mensagem ajustada
  @IsNotEmpty({ message: 'A UF/Província é obrigatória.' })
  @MaxLength(100, {
    message: 'A UF/Província não pode ter mais de 100 caracteres.',
  }) // Comprimento mais flexível para nomes de estados/províncias de qualquer país
  uf: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 },
    { message: 'O peso deve ser um número válido.' },
  )
  @IsPositive({ message: 'O peso deve ser um número positivo.' })
  @Min(0, { message: 'O peso não pode ser negativo.' })
  @Max(999999.999, {
    message:
      'O peso não pode ter mais de 6 dígitos inteiros (ex: 999.999,999).',
  })
  @IsNotEmpty({ message: 'O peso é obrigatório.' })
  peso: number;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 3 },
    { message: 'O volume deve ser um número válido.' },
  )
  @IsPositive({ message: 'O volume deve ser um número positivo.' })
  @Min(0, { message: 'O volume não pode ser negativo.' })
  @Max(999999.999, {
    message:
      'O volume não pode ter mais de 6 dígitos inteiros (ex: 999.999,999).',
  })
  volume?: number;

  @IsOptional()
  @IsString({ message: 'O prazo deve ser uma string.' })
  @MaxLength(50, { message: 'O prazo não pode ter mais de 50 caracteres.' })
  prazo?: string;

  @IsOptional()
  @IsString({ message: 'A prioridade deve ser uma string.' })
  @IsIn(Object.values(OrderPriority), {
    message:
      'A prioridade deve ser uma das opções válidas: BAIXA, MEDIA, ALTA, URGENTE.',
  })
  prioridade?: string;

  @IsOptional()
  @IsString({ message: 'O telefone deve ser uma string.' })
  @Matches(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, {
    message:
      'O telefone deve ser um número de telefone válido (ex: (99) 99999-9999 ou 99999999999).',
  })
  telefone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'O email deve ser um endereço de e-mail válido.' })
  @MaxLength(255, { message: 'O email não pode ter mais de 255 caracteres.' })
  email?: string;

  @IsString({ message: 'O bairro deve ser uma string.' })
  @IsNotEmpty({ message: 'O bairro é obrigatório.' })
  @MaxLength(100, { message: 'O bairro não pode ter mais de 100 caracteres.' })
  bairro: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'O valor deve ser um número válido.' },
  )
  @IsPositive({ message: 'O valor deve ser um número positivo.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  @Max(9999999.99, {
    message:
      'O valor não pode ter mais de 7 dígitos inteiros (ex: 9.999.999,99).',
  })
  @IsNotEmpty({ message: 'O valor é obrigatório.' })
  valor: number;

  @IsOptional()
  @IsString({ message: 'As instruções de entrega devem ser uma string.' })
  @MaxLength(1000, {
    message: 'As instruções de entrega não podem ter mais de 1000 caracteres.',
  })
  instrucoesEntrega?: string;

  @IsOptional()
  @IsString({ message: 'O nome do contato deve ser uma string.' })
  @MaxLength(200, {
    message: 'O nome do contato não pode ter mais de 200 caracteres.',
  })
  nomeContato?: string;

  @IsString({ message: 'O CPF/CNPJ deve ser uma string.' })
  @IsNotEmpty({ message: 'O CPF/CNPJ é obrigatório.' })
  @Matches(/^(\d{11}|\d{14})$/, {
    message: 'O CPF/CNPJ deve ter 11 ou 14 dígitos numéricos.',
  })
  cpfCnpj: string;

  @IsString({ message: 'O CEP/Código Postal deve ser uma string.' }) // Mensagem ajustada
  @IsNotEmpty({ message: 'O CEP/Código Postal é obrigatório.' })
  // Mantendo a validação de 8 dígitos numéricos para CEP brasileiro,
  // mas se for para outros países, esta validação precisará ser mais flexível,
  // talvez dependendo de um campo 'pais'. Por enquanto, mantém o CEP brasileiro.
  @Length(8, 8, {
    message: 'O CEP/Código Postal deve ter exatamente 8 dígitos.',
  })
  @Matches(/^\d{8}$/, {
    message: 'O CEP/Código Postal deve conter apenas 8 dígitos numéricos.',
  })
  cep: string;

  @IsOptional()
  @IsString({ message: 'O status deve ser uma string.' })
  @IsIn(Object.values(OrderInitialStatus), {
    message: 'O status inicial fornecido não é válido.',
  })
  status?: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'O ID da entrega associada deve ser um UUID válido (versão 4).',
  })
  deliveryId?: string;

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 0 },
    { message: 'A ordem de classificação deve ser um número inteiro válido.' },
  )
  @Min(0, { message: 'A ordem de classificação não pode ser negativa.' })
  sorting?: number;
}
