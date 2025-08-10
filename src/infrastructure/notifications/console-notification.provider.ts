// src/infrastructure/notifications/console-notification.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationPayload,
} from './notification.interface';

@Injectable()
export class ConsoleNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(ConsoleNotificationProvider.name);

  async send(payload: NotificationPayload): Promise<void> {
    const { recipient, channels, templateId, data } = payload;

    const logMessage = `
      --- NOTIFICATION ---
      Template:   ${templateId}
      Channels:   ${channels.join(', ')}
      Recipient:  ${JSON.stringify(recipient)}
      Data:       ${JSON.stringify(data)}
      ----------------------
    `;

    this.logger.log(logMessage);

    // Em uma implementação real, aqui você chamaria o serviço de Email, SMS, etc.
    return Promise.resolve();
  }
}
