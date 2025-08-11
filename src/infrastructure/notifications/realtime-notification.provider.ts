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

    if (recipient.userId && data.tenantId) {
      try {
        await this.notificationsService.create({
          userId: recipient.userId,
          tenantId: data.tenantId,
          type: templateId,
          message: this.generateMessage(templateId, data),
          linkTo: data.linkTo || null,
        });
      } catch (error) {
        this.logger.error(
          'Falha ao salvar a notificação no banco de dados.',
          error,
        );
      }
    }

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          if (recipient.userId) {
            this.notificationGateway.sendToUser(
              recipient.userId,
              templateId,
              data,
            );
          }
          break;
        case 'sms':
          this.logger.log(`[SIMULAÇÃO] Enviando SMS para ${recipient.phone}`);
          break;
        case 'email':
          this.logger.log(`[SIMULAÇÃO] Enviando Email para ${recipient.email}`);
          break;
        default:
          this.logger.warn(`Canal de notificação '${channel}' não suportado.`);
      }
    }
  }

  private generateMessage(templateId: string, data: any): string {
    const deliveryShortId = data.deliveryId?.slice(0, 8) || 'N/A';
    const orderShortId = data.orderId?.slice(0, 8) || 'N/A';
    const orderNumber = data.orderNumber || orderShortId;

    switch (templateId) {
      case 'delivery-approved-for-driver':
        return `Roteiro ${deliveryShortId}... foi aprovado e liberado para entrega`;

      case 'delivery-needs-approval':
        return `Roteiro ${deliveryShortId}... aguarda sua aprovação`;

      case 'delivery-needs-reapproval':
        return `Roteiro ${deliveryShortId}... precisa de nova aprovação após alterações`;

      case 'delivery-needs-reapproval-order-removed':
        return `Roteiro ${deliveryShortId}... precisa de nova aprovação - pedido ${orderNumber} removido`;

      case 'delivery-completed':
        return `Roteiro ${deliveryShortId}... foi finalizado com sucesso`;

      case 'delivery-rejected':
        return `Roteiro ${deliveryShortId}... foi rejeitado - ${data.reason || 'sem motivo informado'}`;

      case 'order-status-changed':
        return this.getOrderStatusMessage(
          data.newStatus,
          orderNumber,
          data.customerName,
        );

      default:
        return 'Você tem uma nova notificação';
    }
  }

  private getOrderStatusMessage(
    newStatus: string,
    orderNumber: string,
    customerName: string,
  ): string {
    const customer = customerName || 'Cliente';

    switch (newStatus) {
      case 'EM_ENTREGA':
        return `Entrega ${orderNumber} iniciada para ${customer}`;

      case 'ENTREGUE':
        return `Entrega ${orderNumber} finalizada com sucesso para ${customer}`;

      case 'NAO_ENTREGUE':
        return `Entrega ${orderNumber} não realizada para ${customer}`;

      case 'EM_ROTA':
        return `Pedido ${orderNumber} saiu para entrega - ${customer}`;

      case 'EM_ROTA_AGUARDANDO_LIBERACAO':
        return `Pedido ${orderNumber} aguarda liberação - ${customer}`;

      default:
        return `Status do pedido ${orderNumber} alterado para ${newStatus} - ${customer}`;
    }
  }
}
