// Conteúdo para: src/orders/dto/order-history-event.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
  IsUrl,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '../../types/status.enum';

export enum OrderHistoryEventType {
  PEDIDO_CRIADO = 'PEDIDO_CRIADO',
  ROTEIRO_ASSOCIADO_AGUARDANDO_LIBERACAO = 'ROTEIRO_ASSOCIADO_AGUARDANDO_LIBERACAO',
  ROTEIRO_ASSOCIADO = 'ROTEIRO_ASSOCIADO',
  ROTEIRO_LIBERADO_PARA_PEDIDO = 'ROTEIRO_LIBERADO_PARA_PEDIDO',
  ROTEIRO_REJEITADO_PARA_PEDIDO = 'ROTEIRO_REJEITADO_PARA_PEDIDO',
  ROTEIRO_REMOVIDO = 'ROTEIRO_REMOVIDO',
  ENTREGA_INICIADA = 'ENTREGA_INICIADA',
  PEDIDO_ENTREGUE = 'PEDIDO_ENTREGUE',
  PEDIDO_NAO_ENTREGUE = 'PEDIDO_NAO_ENTREGUE',
  COMPROVANTE_ANEXADO = 'COMPROVANTE_ANEXADO',
  STATUS_PEDIDO_ATUALIZADO = 'STATUS_PEDIDO_ATUALIZADO',
  ROTEIRO_CRIADO_A_LIBERAR = 'ROTEIRO_CRIADO_A_LIBERAR',
  ROTEIRO_CRIADO_INICIADO = 'ROTEIRO_CRIADO_INICIADO',
  ROTEIRO_LIBERADO = 'ROTEIRO_LIBERADO',
  ROTEIRO_REJEITADO = 'ROTEIRO_REJEITADO',
  ROTEIRO_FINALIZADO = 'ROTEIRO_FINALIZADO',
  // NOVO: Adicionado para resolver o erro
  ROTEIRO_REQUER_NOVA_LIBERACAO_PARA_PEDIDO = 'ROTEIRO_REQUER_NOVA_LIBERACAO_PARA_PEDIDO',
}

// Sub-DTO para os detalhes do evento
export class OrderHistoryEventDetailsDto {
  @IsOptional()
  @IsString({ message: 'O status antigo deve ser uma string.' })
  // @IsIn(Object.values(DeliveryStatus), { message: 'O status antigo não é válido.' }) // Se for status de entrega
  oldStatus?: string;

  @IsOptional()
  @IsString({ message: 'O novo status deve ser uma string.' })
  // @IsIn(Object.values(DeliveryStatus), { message: 'O novo status não é válido.' }) // Se for status de entrega
  newStatus?: string;

  @IsOptional()
  @IsString({ message: 'O motivo deve ser uma string.' })
  @MaxLength(500, { message: 'O motivo não pode ter mais de 500 caracteres.' })
  reason?: string;

  @IsOptional()
  @IsString({ message: 'O motivo de não entrega deve ser uma string.' })
  @MaxLength(500, {
    message: 'O motivo de não entrega não pode ter mais de 500 caracteres.',
  })
  motivoNaoEntrega?: string;

  @IsOptional()
  @IsString({
    message: 'O código do motivo de não entrega deve ser uma string.',
  })
  @MaxLength(50, {
    message:
      'O código do motivo de não entrega não pode ter mais de 50 caracteres.',
  })
  codigoMotivoNaoEntrega?: string;

  @IsOptional()
  @IsUrl({}, { message: 'A URL do comprovante deve ser uma URL válida.' })
  @MaxLength(2048, {
    message: 'A URL do comprovante não pode ter mais de 2048 caracteres.',
  })
  proofUrl?: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'O ID da entrega deve ser um UUID válido (versão 4).',
  })
  deliveryId?: string;

  @IsOptional()
  @IsString({ message: 'O nome do motorista deve ser uma string.' })
  @MaxLength(100, {
    message: 'O nome do motorista não pode ter mais de 100 caracteres.',
  })
  driverName?: string;

  @IsOptional()
  @IsString({ message: 'A placa do veículo deve ser uma string.' })
  @MaxLength(10, {
    message: 'A placa do veículo não pode ter mais de 10 caracteres.',
  })
  vehiclePlate?: string;

  @IsOptional()
  @IsString({ message: 'O status da entrega deve ser uma string.' })
  @IsIn(Object.values(DeliveryStatus), {
    message: 'O status da entrega não é válido.',
  })
  deliveryStatus?: string;

  @IsOptional()
  @IsString({ message: 'A ação de aprovação deve ser uma string.' })
  @IsIn(['APPROVED', 'REJECTED'], {
    message: "A ação de aprovação deve ser 'APPROVED' ou 'REJECTED'.",
  })
  approvalAction?: string;

  @IsOptional()
  @IsString({ message: 'O motivo da aprovação/rejeição deve ser uma string.' })
  @MaxLength(500, {
    message:
      'O motivo da aprovação/rejeição não pode ter mais de 500 caracteres.',
  })
  approvalReason?: string;

  @IsOptional()
  @IsString({ message: 'O número do pedido deve ser uma string.' })
  @MaxLength(50, {
    message: 'O número do pedido não pode ter mais de 50 caracteres.',
  })
  orderNumber?: string;

  @IsOptional()
  @IsString({ message: 'O status final deve ser uma string.' })
  @MaxLength(50, {
    message: 'O status final não pode ter mais de 50 caracteres.',
  })
  finalStatus?: string;
}

export class OrderHistoryEventDto {
  @IsUUID('4', {
    message: 'O ID do evento deve ser um UUID válido (versão 4).',
  })
  @IsNotEmpty({ message: 'O ID do evento é obrigatório.' })
  id: string;

  @IsDateString(
    { strict: true },
    {
      message:
        'O timestamp deve ser uma string de data ISO 8601 válida (ex: AAAA-MM-DDT00:00:00.000Z).',
    },
  )
  @IsNotEmpty({ message: 'O timestamp é obrigatório.' })
  timestamp: string;

  @IsEnum(OrderHistoryEventType, {
    message:
      'O tipo de evento não é um tipo de evento de histórico de pedido válido.',
  })
  @IsNotEmpty({ message: 'O tipo de evento é obrigatório.' })
  eventType: OrderHistoryEventType;

  @IsString({ message: 'A descrição deve ser uma string.' })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  @MaxLength(1000, {
    message: 'A descrição não pode ter mais de 1000 caracteres.',
  })
  description: string;

  @IsOptional()
  @IsString({ message: 'O usuário deve ser uma string.' })
  @MaxLength(100, { message: 'O usuário não pode ter mais de 100 caracteres.' })
  user?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderHistoryEventDetailsDto)
  details?: OrderHistoryEventDetailsDto;
}
