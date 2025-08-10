// src/infrastructure/audit/console-audit.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { IAuditProvider, AuditLogPayload } from './audit.interface';

@Injectable()
export class ConsoleAuditProvider implements IAuditProvider {
  private readonly logger = new Logger('Audit');

  async logAction(payload: AuditLogPayload): Promise<void> {
    const { userId, tenantId, action, target, details } = payload;

    const logObject = {
      action,
      userId,
      tenantId,
      entity: target.entity,
      entityId: target.entityId,
      details: details || 'No additional details',
    };

    this.logger.log(JSON.stringify(logObject, null, 2));

    // Em uma implementação real, você salvaria este objeto em uma tabela
    // `AuditLogs` no banco de dados ou enviaria para um serviço de log.
    return Promise.resolve();
  }
}
