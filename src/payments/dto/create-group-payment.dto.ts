import {
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize, // Para garantir que o array não esteja vazio (mas ArrayMinSize já faz isso)
} from 'class-validator';

export class CreateGroupPaymentDto {
  @IsArray({ message: 'paymentIds deve ser um array.' })
  @ArrayMinSize(1, {
    message: 'É necessário fornecer pelo menos um ID de pagamento.',
  }) // O grupo deve ter pelo menos um pagamento
  // Opcional: Limite o tamanho do array para evitar payloads muito grandes
  @ArrayMaxSize(100, {
    message: 'Não é possível agrupar mais de 100 pagamentos por vez.',
  })
  @IsUUID('4', {
    each: true,
    message: 'Cada ID de pagamento deve ser um UUID válido (versão 4).',
  }) // Valida cada item do array como um UUID v4
  paymentIds: string[];
}
