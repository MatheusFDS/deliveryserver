// Conteúdo para: status.enum.ts

// Status dos PEDIDOS INDIVIDUAIS (Orders)
export enum OrderStatus {
  SEM_ROTA = 'Sem rota', // Pedido não atribuído a um roteiro
  EM_ROTA_AGUARDANDO_LIBERACAO = 'Em rota, aguardando liberação', // Pedido em roteiro que precisa de aprovação
  EM_ROTA = 'Em rota', // Pedido em roteiro liberado/iniciado
  EM_ENTREGA = 'Em entrega', // Motorista está a caminho do cliente para este pedido
  ENTREGUE = 'Entregue', // Entrega bem-sucedida
  NAO_ENTREGUE = 'Não entregue', // Tentativa de entrega falhou (com motivo)
}

// Status dos ROTEIROS (Deliveries)
export enum DeliveryStatus {
  A_LIBERAR = 'A liberar', // Roteiro aguardando aprovação
  INICIADO = 'Iniciado', // Roteiro liberado e em andamento
  FINALIZADO = 'Finalizado', // Todas as entregas do roteiro foram processadas
  REJEITADO = 'Rejeitado', // Roteiro foi rejeitado durante a liberação
}

// Status dos PAGAMENTOS (AccountsPayable)
export enum PaymentStatus {
  PENDENTE = 'Pendente', // Pagamento aguardando processamento
  PAGO = 'Pago', // Pagamento realizado
  BAIXADO = 'Baixado', // Pagamento baixado/quitado
  CANCELADO = 'Cancelado', // Pagamento cancelado
}

// Status dos USUÁRIOS
export enum UserStatus {
  ATIVO = 'Ativo',
  INATIVO = 'Inativo',
  BLOQUEADO = 'Bloqueado',
  PENDENTE = 'Pendente',
}

// Status dos TENANTS
export enum TenantStatus {
  ATIVO = 'Ativo',
  INATIVO = 'Inativo',
  SUSPENSO = 'Suspenso',
  TRIAL = 'Trial',
}

// Ações de Aprovação
export enum ApprovalAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RE_APPROVAL_NEEDED = 'RE_APPROVAL_NEEDED',
}

// Prioridades de pedidos
export enum OrderPriority {
  BAIXA = 'Baixa',
  NORMAL = 'Normal',
  ALTA = 'Alta',
  URGENTE = 'Urgente',
}

// MAPEAMENTO: Backend ↔ Mobile (Atualizado)
export const STATUS_MAPPING = {
  ORDER_TO_MOBILE: {
    [OrderStatus.SEM_ROTA]: 'sem_rota',
    [OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO]: 'aguardando_liberacao_rota',
    [OrderStatus.EM_ROTA]: 'em_rota',
    [OrderStatus.EM_ENTREGA]: 'em_entrega',
    [OrderStatus.ENTREGUE]: 'entregue',
    [OrderStatus.NAO_ENTREGUE]: 'nao_entregue',
  },
  MOBILE_TO_ORDER: {
    sem_rota: OrderStatus.SEM_ROTA,
    aguardando_liberacao_rota: OrderStatus.EM_ROTA_AGUARDANDO_LIBERACAO,
    em_rota: OrderStatus.EM_ROTA,
    em_entrega: OrderStatus.EM_ENTREGA,
    iniciada: OrderStatus.EM_ENTREGA, // Retrocompatibilidade
    entregue: OrderStatus.ENTREGUE,
    finalizada: OrderStatus.ENTREGUE, // Retrocompatibilidade
    nao_entregue: OrderStatus.NAO_ENTREGUE,
    retornada: OrderStatus.NAO_ENTREGUE, // Retrocompatibilidade
  },
  DELIVERY_TO_MOBILE: {
    [DeliveryStatus.A_LIBERAR]: 'a_liberar',
    [DeliveryStatus.INICIADO]: 'iniciado',
    [DeliveryStatus.FINALIZADO]: 'finalizado',
    [DeliveryStatus.REJEITADO]: 'rejeitado',
  },
  MOBILE_TO_DELIVERY: {
    a_liberar: DeliveryStatus.A_LIBERAR,
    iniciado: DeliveryStatus.INICIADO,
    pendente: DeliveryStatus.INICIADO, // Retrocompatibilidade
    finalizado: DeliveryStatus.FINALIZADO,
    rejeitado: DeliveryStatus.REJEITADO,
  },
  PAYMENT_TO_MOBILE: {
    [PaymentStatus.PENDENTE]: 'pendente',
    [PaymentStatus.PAGO]: 'pago',
    [PaymentStatus.BAIXADO]: 'baixado',
    [PaymentStatus.CANCELADO]: 'cancelado',
  },
  MOBILE_TO_PAYMENT: {
    pendente: PaymentStatus.PENDENTE,
    pago: PaymentStatus.PAGO,
    baixado: PaymentStatus.BAIXADO,
    cancelado: PaymentStatus.CANCELADO,
  },
};

// Modelos de motivo para não entrega
export interface MotivoNaoEntrega {
  codigo: string;
  descricao: string;
}

export const MOTIVOS_NAO_ENTREGA: MotivoNaoEntrega[] = [
  { codigo: 'AUSENTE', descricao: 'Destinatário ausente' },
  { codigo: 'END_INC', descricao: 'Endereço incorreto/incompleto' },
  { codigo: 'RECUSADO', descricao: 'Recusado pelo destinatário' },
  { codigo: 'AVARIA', descricao: 'Produto avariado' },
  { codigo: 'SEM_DINHEIRO', descricao: 'Cliente sem dinheiro para pagamento' },
  { codigo: 'ESTABELECIMENTO_FECHADO', descricao: 'Estabelecimento fechado' },
  { codigo: 'REJEICAO_FISCAL', descricao: 'Rejeição por questões fiscais' },
  { codigo: 'OUTRO', descricao: 'Outro motivo (especificar)' },
];

// Tipos de usuários/roles
export enum UserRole {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  DRIVER = 'driver',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

// Status de veículos
export enum VehicleStatus {
  ATIVO = 'Ativo',
  INATIVO = 'Inativo',
  MANUTENCAO = 'Manutenção',
  DISPONIVEL = 'Disponível',
  EM_USO = 'Em uso',
}
