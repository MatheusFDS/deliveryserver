// src/infrastructure/notifications/notification.interface.ts

export const NOTIFICATION_PROVIDER = 'NotificationProvider';

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  pushToken?: string;
}

export interface NotificationPayload {
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  templateId: string;
  data: Record<string, any>;
}

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
