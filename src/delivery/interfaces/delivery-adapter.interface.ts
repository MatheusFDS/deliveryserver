// =============================================================================
// src/delivery/interfaces/delivery-adapter.interface.ts
// =============================================================================

/**
 * DELIVERY ADAPTER INTERFACES - ABSTRAÇÕES PARA INTEGRAÇÕES EXTERNAS
 *
 * Justificativa: Define contratos claros para todas as integrações externas
 * do módulo de delivery, permitindo trocar providers sem impacto no sistema.
 *
 * Tipos de Abstrações:
 * - 📱 Notificações (SMS, Push, Email, WhatsApp)
 * - 📍 Tracking em tempo real (GPS, telemetria)
 * - 🔗 Webhooks para sistemas externos
 * - 💰 Cálculo de frete (múltiplas transportadoras)
 * - 📋 Auditoria e compliance
 * - 🎯 Validações de regras de negócio
 */

import { DeliveryStatus, OrderStatus } from '@prisma/client';

// =============================================================================
// TIPOS BASE E INTERFACES COMUNS
// =============================================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliveryLocation extends LatLng {
  timestamp: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface ContactInfo {
  name: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: LatLng;
}

// =============================================================================
// DELIVERY CORE TYPES
// =============================================================================

export interface DeliveryOrderInfo {
  id: string;
  orderNumber: string;
  clientName: string;
  clientContact: ContactInfo;
  address: DeliveryAddress;
  value: number;
  weight: number;
  status: OrderStatus;
  estimatedDeliveryTime?: Date;
  sorting?: number;
}

export interface DeliveryInfo {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  vehicleId: string;
  vehiclePlate: string;
  status: DeliveryStatus;
  startDate: Date;
  endDate?: Date;
  totalValue: number;
  totalWeight: number;
  freightValue: number;
  orders: DeliveryOrderInfo[];
  currentLocation?: DeliveryLocation;
  estimatedCompletion?: Date;
}

// =============================================================================
// NOTIFICATION PROVIDER INTERFACE
// =============================================================================

export const NOTIFICATION_PROVIDER = 'NotificationProvider';

export interface NotificationTemplate {
  templateId: string;
  variables?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  retryable?: boolean;
}

export interface INotificationProvider {
  /**
   * Notifica criação de nova entrega
   */
  notifyDeliveryCreated(
    delivery: DeliveryInfo,
    recipients: ContactInfo[],
  ): Promise<NotificationResult[]>;

  /**
   * Notifica aprovação de roteiro
   */
  notifyDeliveryApproved(
    delivery: DeliveryInfo,
    recipients: ContactInfo[],
  ): Promise<NotificationResult[]>;

  /**
   * Notifica rejeição de roteiro
   */
  notifyDeliveryRejected(
    delivery: DeliveryInfo,
    reason: string,
    recipients: ContactInfo[],
  ): Promise<NotificationResult[]>;

  /**
   * Notifica início de rota
   */
  notifyRouteStarted(
    delivery: DeliveryInfo,
    estimatedArrival: Date,
  ): Promise<NotificationResult[]>;

  /**
   * Notifica mudança de status de pedido
   */
  notifyOrderStatusChanged(
    order: DeliveryOrderInfo,
    previousStatus: OrderStatus,
    delivery: DeliveryInfo,
  ): Promise<NotificationResult[]>;

  /**
   * Notifica entrega concluída
   */
  notifyDeliveryCompleted(
    delivery: DeliveryInfo,
    summary: DeliveryCompletionSummary,
  ): Promise<NotificationResult[]>;

  /**
   * Notifica atraso na entrega
   */
  notifyDeliveryDelayed(
    delivery: DeliveryInfo,
    delayReason: string,
    newEstimatedTime: Date,
  ): Promise<NotificationResult[]>;

  /**
   * Envia notificação customizada
   */
  sendCustomNotification(
    recipients: ContactInfo[],
    template: NotificationTemplate,
    channel: 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP',
  ): Promise<NotificationResult[]>;
}

// =============================================================================
// TRACKING PROVIDER INTERFACE
// =============================================================================

export const TRACKING_PROVIDER = 'TrackingProvider';

export interface TrackingConfig {
  updateInterval: number; // segundos
  accuracyThreshold: number; // metros
  enableGeofencing: boolean;
  enableSpeedMonitoring: boolean;
}

export interface GeofenceArea {
  center: LatLng;
  radius: number; // metros
  type: 'PICKUP' | 'DELIVERY' | 'DEPOT';
}

export interface TrackingEvent {
  deliveryId: string;
  orderId?: string;
  location: DeliveryLocation;
  eventType:
    | 'LOCATION_UPDATE'
    | 'GEOFENCE_ENTER'
    | 'GEOFENCE_EXIT'
    | 'SPEED_ALERT';
  metadata?: Record<string, any>;
}

export interface ITrackingProvider {
  /**
   * Inicia tracking de uma entrega
   */
  startTracking(deliveryId: string, config?: TrackingConfig): Promise<void>;

  /**
   * Para tracking de uma entrega
   */
  stopTracking(deliveryId: string): Promise<void>;

  /**
   * Obtém localização atual
   */
  getCurrentLocation(deliveryId: string): Promise<DeliveryLocation | null>;

  /**
   * Obtém histórico de localizações
   */
  getLocationHistory(
    deliveryId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DeliveryLocation[]>;

  /**
   * Configura geofences para a entrega
   */
  setupGeofences(deliveryId: string, geofences: GeofenceArea[]): Promise<void>;

  /**
   * Calcula ETA para próxima parada
   */
  calculateETA(
    currentLocation: LatLng,
    destination: LatLng,
    trafficConditions?: 'LIGHT' | 'MODERATE' | 'HEAVY',
  ): Promise<{
    estimatedArrival: Date;
    distance: number;
    duration: number;
  }>;

  /**
   * Monitora eventos de tracking
   */
  onTrackingEvent(callback: (event: TrackingEvent) => Promise<void>): void;
}

// =============================================================================
// WEBHOOK PROVIDER INTERFACE
// =============================================================================

export const WEBHOOK_PROVIDER = 'WebhookProvider';

export interface WebhookConfig {
  url: string;
  secret?: string;
  retryAttempts: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface WebhookPayload {
  event: string;
  timestamp: Date;
  deliveryId: string;
  tenantId: string;
  data: Record<string, any>;
  signature?: string;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  retryable: boolean;
  duration: number;
}

export interface IWebhookProvider {
  /**
   * Registra webhook para tenant
   */
  registerWebhook(
    tenantId: string,
    events: string[],
    config: WebhookConfig,
  ): Promise<string>; // retorna webhook ID

  /**
   * Remove webhook
   */
  unregisterWebhook(tenantId: string, webhookId: string): Promise<void>;

  /**
   * Dispara webhook para evento específico
   */
  triggerWebhook(
    tenantId: string,
    event: string,
    payload: Omit<WebhookPayload, 'event' | 'timestamp' | 'signature'>,
  ): Promise<WebhookResult[]>;

  /**
   * Obtém status de webhooks
   */
  getWebhookStatus(
    tenantId: string,
    webhookId?: string,
  ): Promise<
    {
      id: string;
      url: string;
      events: string[];
      status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
      lastTriggered?: Date;
      errorCount: number;
    }[]
  >;

  /**
   * Reprocessa webhook falhado
   */
  retryFailedWebhook(
    tenantId: string,
    webhookId: string,
    payloadId: string,
  ): Promise<WebhookResult>;
}

// =============================================================================
// FREIGHT CALCULATOR INTERFACE
// =============================================================================

export const FREIGHT_CALCULATOR = 'FreightCalculator';

export interface FreightCalculationInput {
  origin: DeliveryAddress;
  destinations: DeliveryAddress[];
  vehicle: {
    id: string;
    type: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
    capacity: number;
    costPerKm: number;
  };
  orders: {
    id: string;
    weight: number;
    value: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  }[];
  options?: {
    includeInsurance: boolean;
    includeTolls: boolean;
    urgentDelivery: boolean;
    timeWindow?: {
      start: Date;
      end: Date;
    };
  };
}

export interface FreightCalculationResult {
  provider: string;
  totalCost: number;
  breakdown: {
    baseCost: number;
    distanceCost: number;
    weightCost: number;
    insuranceCost?: number;
    tollCost?: number;
    urgencyFee?: number;
    taxes: number;
  };
  estimatedDeliveryTime: Date;
  confidence: number; // 0-1
  metadata?: Record<string, any>;
}

export interface IFreightCalculator {
  /**
   * Calcula frete para uma entrega
   */
  calculateFreight(
    input: FreightCalculationInput,
  ): Promise<FreightCalculationResult>;

  /**
   * Obtém múltiplas cotações
   */
  getMultipleQuotes(
    input: FreightCalculationInput,
    providers: string[],
  ): Promise<FreightCalculationResult[]>;

  /**
   * Valida se endereço é atendido
   */
  validateServiceArea(
    address: DeliveryAddress,
    serviceType: 'EXPRESS' | 'STANDARD' | 'ECONOMIC',
  ): Promise<{
    available: boolean;
    estimatedDays: number;
    restrictions?: string[];
  }>;

  /**
   * Calcula frete por zona
   */
  calculateByZone(
    zipCode: string,
    weight: number,
    value: number,
  ): Promise<FreightCalculationResult>;
}

// =============================================================================
// AUDIT PROVIDER INTERFACE
// =============================================================================

export const AUDIT_PROVIDER = 'AuditProvider';

export interface AuditEvent {
  tenantId: string;
  userId: string;
  deliveryId?: string;
  orderId?: string;
  action: string;
  resource: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuditProvider {
  /**
   * Registra evento de auditoria
   */
  logEvent(event: AuditEvent): Promise<void>;

  /**
   * Obtém log de auditoria
   */
  getAuditLog(
    tenantId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      deliveryId?: string;
      action?: string;
    },
    pagination: {
      page: number;
      pageSize: number;
    },
  ): Promise<{
    events: AuditEvent[];
    total: number;
    page: number;
    pageSize: number;
  }>;

  /**
   * Exporta relatório de auditoria
   */
  exportAuditReport(
    tenantId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      format: 'PDF' | 'CSV' | 'XLSX';
    },
  ): Promise<{
    fileUrl: string;
    expiresAt: Date;
  }>;
}

// =============================================================================
// BUSINESS RULES VALIDATOR INTERFACE
// =============================================================================

export const BUSINESS_RULES_VALIDATOR = 'BusinessRulesValidator';

export interface DeliveryRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: 'APPROVAL' | 'VALIDATION' | 'CALCULATION';
  conditions: Record<string, any>;
  actions: Record<string, any>;
  active: boolean;
  priority: number;
}

export interface RuleValidationResult {
  valid: boolean;
  violations: {
    ruleId: string;
    ruleName: string;
    message: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    metadata?: Record<string, any>;
  }[];
  requiresApproval: boolean;
  approvalReasons: string[];
}

export interface IBusinessRulesValidator {
  /**
   * Valida criação de entrega
   */
  validateDeliveryCreation(
    delivery: Partial<DeliveryInfo>,
    tenantId: string,
  ): Promise<RuleValidationResult>;

  /**
   * Valida atualização de entrega
   */
  validateDeliveryUpdate(
    currentDelivery: DeliveryInfo,
    updates: Partial<DeliveryInfo>,
    tenantId: string,
  ): Promise<RuleValidationResult>;

  /**
   * Valida mudança de status
   */
  validateStatusChange(
    delivery: DeliveryInfo,
    newStatus: DeliveryStatus | OrderStatus,
    context: Record<string, any>,
  ): Promise<RuleValidationResult>;

  /**
   * Obtém regras ativas para tenant
   */
  getActiveRules(tenantId: string): Promise<DeliveryRule[]>;

  /**
   * Aplica regras de cálculo
   */
  applyCalculationRules(
    delivery: DeliveryInfo,
    ruleType: 'FREIGHT' | 'DISCOUNT' | 'FEE',
  ): Promise<{
    originalValue: number;
    adjustedValue: number;
    appliedRules: {
      ruleId: string;
      adjustment: number;
      reason: string;
    }[];
  }>;
}

// =============================================================================
// ADAPTER PRINCIPAL - COMPOSIÇÃO DE TODAS AS INTERFACES
// =============================================================================

export const DELIVERY_ADAPTER = 'DeliveryAdapter';

export interface DeliveryCompletionSummary {
  totalDelivered: number;
  totalFailed: number;
  totalValue: number;
  startTime: Date;
  endTime: Date;
  distance: number;
  averageDeliveryTime: number;
  failureReasons: Record<string, number>;
}

/**
 * Interface principal que orquestra todas as operações de delivery
 * Compõe os diferentes providers para operações complexas
 */
export interface IDeliveryAdapter {
  /**
   * Processa criação completa de entrega
   * Inclui: validação, notificação, tracking setup, audit
   */
  processDeliveryCreation(
    delivery: DeliveryInfo,
    tenantId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    delivery: DeliveryInfo;
    notifications: NotificationResult[];
    webhooks: WebhookResult[];
    needsApproval: boolean;
    violations: RuleValidationResult;
  }>;

  /**
   * Processa aprovação de entrega
   */
  processDeliveryApproval(
    deliveryId: string,
    userId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    delivery: DeliveryInfo;
    notifications: NotificationResult[];
    webhooks: WebhookResult[];
  }>;

  /**
   * Processa início de rota
   */
  processRouteStart(
    deliveryId: string,
    initialLocation: LatLng,
  ): Promise<{
    success: boolean;
    trackingStarted: boolean;
    notifications: NotificationResult[];
    estimatedCompletionTimes: Record<string, Date>; // orderId -> ETA
  }>;

  /**
   * Processa atualização de status de pedido
   */
  processOrderStatusUpdate(
    orderId: string,
    newStatus: OrderStatus,
    context: {
      driverId: string;
      location?: LatLng;
      reason?: string;
      evidence?: string[]; // URLs de fotos, assinaturas, etc.
    },
  ): Promise<{
    success: boolean;
    notifications: NotificationResult[];
    webhooks: WebhookResult[];
    trackingEvents: TrackingEvent[];
  }>;

  /**
   * Processa finalização de entrega
   */
  processDeliveryCompletion(
    deliveryId: string,
    summary: DeliveryCompletionSummary,
  ): Promise<{
    success: boolean;
    notifications: NotificationResult[];
    webhooks: WebhookResult[];
    auditEvents: AuditEvent[];
    reportGenerated: boolean;
  }>;

  /**
   * Obtém status consolidado de entrega
   */
  getDeliveryStatus(
    deliveryId: string,
    includeTracking: boolean,
  ): Promise<{
    delivery: DeliveryInfo;
    currentLocation?: DeliveryLocation;
    estimatedCompletions: Record<string, Date>;
    alerts: {
      type: 'DELAY' | 'GEOFENCE' | 'SPEED' | 'EMERGENCY';
      message: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      timestamp: Date;
    }[];
  }>;

  /**
   * Health check de todos os providers
   */
  healthCheck(): Promise<{
    overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    providers: Record<
      string,
      {
        status: 'UP' | 'DOWN' | 'DEGRADED';
        responseTime: number;
        lastCheck: Date;
        error?: string;
      }
    >;
  }>;
}

// =============================================================================
// FACTORY PARA CRIAÇÃO DE ADAPTERS
// =============================================================================

export interface DeliveryAdapterConfig {
  notification: {
    provider: 'twilio' | 'aws-sns' | 'firebase' | 'custom';
    config: Record<string, any>;
  };
  tracking: {
    provider: 'google-maps' | 'mapbox' | 'here' | 'custom';
    config: Record<string, any>;
  };
  webhook: {
    provider: 'internal' | 'zapier' | 'custom';
    config: Record<string, any>;
  };
  freight: {
    provider: 'correios' | 'loggi' | 'custom';
    config: Record<string, any>;
  };
  audit: {
    provider: 'internal' | 'datadog' | 'custom';
    config: Record<string, any>;
  };
  businessRules: {
    provider: 'internal' | 'custom';
    config: Record<string, any>;
  };
}

export interface IDeliveryAdapterFactory {
  create(config: DeliveryAdapterConfig): IDeliveryAdapter;
  createNotificationProvider(
    type: string,
    config: Record<string, any>,
  ): INotificationProvider;
  createTrackingProvider(
    type: string,
    config: Record<string, any>,
  ): ITrackingProvider;
  createWebhookProvider(
    type: string,
    config: Record<string, any>,
  ): IWebhookProvider;
  createFreightCalculator(
    type: string,
    config: Record<string, any>,
  ): IFreightCalculator;
  createAuditProvider(
    type: string,
    config: Record<string, any>,
  ): IAuditProvider;
  createBusinessRulesValidator(
    type: string,
    config: Record<string, any>,
  ): IBusinessRulesValidator;
}

// =============================================================================
// EXEMPLO DE USO
// =============================================================================

/*
// No seu delivery.service.ts:

constructor(
  @Inject(DELIVERY_ADAPTER) private readonly deliveryAdapter: IDeliveryAdapter,
  @Inject(NOTIFICATION_PROVIDER) private readonly notificationProvider: INotificationProvider,
  @Inject(TRACKING_PROVIDER) private readonly trackingProvider: ITrackingProvider,
  // ... outros providers
) {}

async create(dto: CreateDeliveryDto, userId: string) {
  const result = await this.deliveryAdapter.processDeliveryCreation(
    delivery,
    tenantId,
    userId
  );
  
  return {
    delivery: result.delivery,
    needsApproval: result.needsApproval,
    notifications: result.notifications,
  };
}

// Para trocar provider de notificação:
// No routes.module.ts:
providers: [
  { 
    provide: NOTIFICATION_PROVIDER, 
    useClass: TwilioNotificationProvider // ou WhatsAppProvider, FirebaseProvider, etc.
  },
]
*/
