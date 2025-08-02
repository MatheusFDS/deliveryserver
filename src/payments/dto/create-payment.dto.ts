import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsPositive, // Para garantir valores positivos
  Min, // Para valor mínimo (pode ser 0 se for o caso)
  Max, // Para valor máximo
  IsIn, // Para status
} from 'class-validator';

// Definir um enum para os status de pagamento para controle
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export class CreatePaymentDto {
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'O valor do pagamento deve ser um número válido.' },
  ) // Duas casas decimais para valores monetários
  @IsPositive({ message: 'O valor do pagamento deve ser um número positivo.' }) // Pagamento deve ser positivo
  @Min(0.01, { message: 'O valor do pagamento deve ser no mínimo 0.01.' }) // Pagamento mínimo para evitar zero
  @Max(99999999.99, {
    message:
      'O valor do pagamento não pode ter mais de 8 dígitos inteiros (ex: 99.999.999,99).',
  }) // Limite razoável para valor (8 dígitos inteiros, 2 decimais)
  @IsNotEmpty({ message: 'O valor do pagamento é obrigatório.' })
  amount: number;

  @IsString({ message: 'O status do pagamento deve ser uma string.' })
  @IsNotEmpty({ message: 'O status do pagamento é obrigatório.' })
  @IsIn(Object.values(PaymentStatus), {
    message: 'O status do pagamento fornecido não é válido.',
  }) // Valida contra os status permitidos no enum
  status: string;

  @IsUUID('4', {
    message: 'O ID do tenant deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do tenant é obrigatório.' })
  tenantId: string;

  @IsUUID('4', {
    message: 'O ID do motorista deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do motorista é obrigatório.' })
  motoristaId: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'O ID da entrega (delivery) deve ser um UUID válido (versão 4).',
  })
  deliveryId?: string;
}
