import { Injectable } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationPayload,
} from './notification.interface';
import { NotificationGateway } from './notification.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../shared/services/email.service';

@Injectable()
export class RealtimeNotificationProvider implements INotificationProvider {
  constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
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
          linkTo: this.generateLinkTo(templateId, data),
        });
      } catch (error) {
        // Silent error handling for database notification
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
          // SMS implementation would go here
          break;
        case 'email':
          if (recipient.email) {
            try {
              if (templateId.startsWith('invite-')) {
                // Handle invite emails separately if needed
                // This would be called from the invite process directly
              } else {
                // Handle status/notification emails
                await this.emailService.sendStatusEmail({
                  email: recipient.email,
                  templateId,
                  data,
                });
              }
            } catch (error) {
              // Silent error handling for email
            }
          }
          break;
        default:
          // Unknown channel
          break;
      }
    }
  }

  private generateLinkTo(templateId: string, data: any): string {
    switch (templateId) {
      case 'delivery-approved-for-driver':
      case 'delivery-rejected':
        return '/(tabs)';

      case 'delivery-needs-approval':
      case 'delivery-needs-reapproval':
      case 'delivery-completed':
        return `/entregas/${data.deliveryId}`;

      case 'delivery-needs-reapproval-order-removed':
        return `/entregas/${data.deliveryId}`;

      case 'order-status-changed':
        if (data.orderNumber) {
          return `/pedidos?search=${data.orderNumber}`;
        }
        return `/entregas/${data.deliveryId}`;

      default:
        return '/';
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
