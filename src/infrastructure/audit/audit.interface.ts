// src/infrastructure/audit/audit.interface.ts

export const AUDIT_PROVIDER = 'AuditProvider';

export interface AuditLogPayload {
  userId: string;
  tenantId: string;
  action: string;
  target: {
    entity: string;
    entityId: string;
  };
  details?: Record<string, any>;
  timestamp: Date;
}

export interface IAuditProvider {
  logAction(payload: AuditLogPayload): Promise<void>;
}
