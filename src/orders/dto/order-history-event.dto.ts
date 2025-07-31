// Conteúdo para: src/orders/dto/order-history-event.dto.ts

export enum OrderHistoryEventType {
  PEDIDO_CRIADO = 'PEDIDO_CRIADO',
  ROTEIRO_ASSOCIADO_AGUARDANDO_LIBERACAO = 'ROTEIRO_ASSOCIADO_AGUARDANDO_LIBERACAO', // Pedido em roteiro 'A liberar'
  ROTEIRO_ASSOCIADO = 'ROTEIRO_ASSOCIADO', // Pedido em roteiro 'Iniciado'
  ROTEIRO_LIBERADO_PARA_PEDIDO = 'ROTEIRO_LIBERADO_PARA_PEDIDO', // Roteiro do pedido foi liberado
  ROTEIRO_REJEITADO_PARA_PEDIDO = 'ROTEIRO_REJEITADO_PARA_PEDIDO', // Roteiro do pedido foi rejeitado, pedido voltou para Sem Rota
  ROTEIRO_REMOVIDO = 'ROTEIRO_REMOVIDO', // Pedido removido de um roteiro
  ENTREGA_INICIADA = 'ENTREGA_INICIADA',
  PEDIDO_ENTREGUE = 'PEDIDO_ENTREGUE',
  PEDIDO_NAO_ENTREGUE = 'PEDIDO_NAO_ENTREGUE',
  COMPROVANTE_ANEXADO = 'COMPROVANTE_ANEXADO',
  STATUS_PEDIDO_ATUALIZADO = 'STATUS_PEDIDO_ATUALIZADO',
  // Eventos específicos do Roteiro (podem ser adicionados aqui ou em um DTO de histórico do roteiro)
  ROTEIRO_CRIADO_A_LIBERAR = 'ROTEIRO_CRIADO_A_LIBERAR',
  ROTEIRO_CRIADO_INICIADO = 'ROTEIRO_CRIADO_INICIADO', // Criado e iniciado diretamente
  ROTEIRO_LIBERADO = 'ROTEIRO_LIBERADO', // Ação de liberar o roteiro
  ROTEIRO_REJEITADO = 'ROTEIRO_REJEITADO', // Ação de rejeitar o roteiro
  ROTEIRO_FINALIZADO = 'ROTEIRO_FINALIZADO',
}

export class OrderHistoryEventDto {
  id: string;
  timestamp: string; // ISO string
  eventType: OrderHistoryEventType | string;
  description: string;
  user?: string;
  details?: {
    // Gerais
    oldStatus?: string;
    newStatus?: string;
    reason?: string; // Para rejeições de roteiro ou outros
    motivoNaoEntrega?: string;
    codigoMotivoNaoEntrega?: string;

    // Comprovante
    proofUrl?: string;

    // Roteiro
    deliveryId?: string;
    driverName?: string;
    vehiclePlate?: string;
    deliveryStatus?: string; // Status do roteiro
    approvalAction?: string; // 'APPROVED', 'REJECTED'
    approvalReason?: string; // Motivo da rejeição do roteiro

    // Pedido
    orderNumber?: string;
    finalStatus?: string;
  };
}
