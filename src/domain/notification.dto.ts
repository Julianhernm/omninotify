export type NotificationChannel = 'email' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retrying';

export interface NotificationDTO {
    id: string;
    eventId: string;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    body: string;
    status: NotificationStatus;
    createdAt: Date;
    sentAt?: Date;
    error?: string;
    retryCount: number;
}