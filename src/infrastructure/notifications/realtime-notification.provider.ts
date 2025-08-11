// src/infrastructure/notifications/realtime-notification.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationPayload,
} from './notification.interface';
import { NotificationGateway } from './notification.gateway';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class RealtimeNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(RealtimeNotificationProvider.name);

  constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    const { recipient, channels, templateId, data } = payload;

    // Passo 1: Salvar a notificação no banco de dados (se for para um usuário)
    if (recipient.userId && data.tenantId) {
      try {
        await this.notificationsService.create({
          userId: recipient.userId,
          tenantId: data.tenantId,
          type: templateId,
          message: this.generateMessage(templateId, data), // Gera uma mensagem legível
          linkTo: data.linkTo || null,
        });
      } catch (error) {
        this.logger.error(
          'Falha ao salvar a notificação no banco de dados.',
          error,
        );
        // Continua para tentar enviar em tempo real mesmo assim
      }
    }

    // Passo 2: Enviar a notificação em tempo real pelos canais solicitados
    for (const channel of channels) {
      switch (channel) {
        case 'push': // Web Sockets servem para "push" em apps abertos
          if (recipient.userId) {
            this.notificationGateway.sendToUser(
              recipient.userId,
              templateId,
              data,
            );
          }
          break;

        case 'sms':
          // Lógica futura para envio de SMS aqui
          this.logger.log(`[SIMULAÇÃO] Enviando SMS para ${recipient.phone}`);
          break;

        case 'email':
          // Lógica futura para envio de Email aqui
          this.logger.log(`[SIMULAÇÃO] Enviando Email para ${recipient.email}`);
          break;

        default:
          this.logger.warn(`Canal de notificação '${channel}' não suportado.`);
      }
    }
  }

  // Helper para criar mensagens amigáveis baseadas no template
  private generateMessage(templateId: string, data: any): string {
    switch (templateId) {
      case 'delivery-approved-for-driver':
        return `O roteiro ${data.deliveryId.slice(0, 8)}... foi aprovado e liberado.`;
      case 'delivery-needs-approval':
        return `O roteiro ${data.deliveryId.slice(0, 8)}... requer sua aprovação.`;
      case 'delivery-completed':
        return `O roteiro ${data.deliveryId.slice(0, 8)}... foi finalizado.`;
      default:
        return 'Você tem uma nova notificação.';
    }
  }
}
