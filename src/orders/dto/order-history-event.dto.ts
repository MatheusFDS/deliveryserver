// src/orders/dto/order-history-event.dto.ts

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
// CORREÇÃO: Importar o Enum diretamente do Prisma Client para consistência.
import { DeliveryStatus } from '@prisma/client';

// Este Enum é específico da lógica de histórico, então está correto mantê-lo aqui.
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
  ROTEIRO_REQUER_NOVA_LIBERACAO_PARA_PEDIDO = 'ROTEIRO_REQUER_NOVA_LIBERACAO_PARA_PEDIDO',
}

export class OrderHistoryEventDetailsDto {
  @IsOptional()
  @IsString({ message: 'O status antigo deve ser uma string.' })
  oldStatus?: string;

  @IsOptional()
  @IsString({ message: 'O novo status deve ser uma string.' })
  newStatus?: string;

  @IsOptional()
  @IsString({ message: 'O motivo deve ser uma string.' })
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString({ message: 'O motivo de não entrega deve ser uma string.' })
  @MaxLength(500)
  motivoNaoEntrega?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoMotivoNaoEntrega?: string;

  @IsOptional()
  @IsUrl({}, { message: 'A URL do comprovante deve ser uma URL válida.' })
  @MaxLength(2048)
  proofUrl?: string;

  @IsOptional()
  @IsUUID('4')
  deliveryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  driverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  vehiclePlate?: string;

  @IsOptional()
  // CORREÇÃO: Usando o Enum do Prisma para validação.
  @IsIn(Object.values(DeliveryStatus))
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsString()
  // Ações de aprovação podem ser mais variadas, string é flexível aqui.
  approvalAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  approvalReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  orderNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  finalStatus?: string;
}

export class OrderHistoryEventDto {
  @IsUUID('4')
  @IsNotEmpty()
  id: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  timestamp: string;

  @IsEnum(OrderHistoryEventType)
  @IsNotEmpty()
  eventType: OrderHistoryEventType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  user?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderHistoryEventDetailsDto)
  details?: OrderHistoryEventDetailsDto;
}
