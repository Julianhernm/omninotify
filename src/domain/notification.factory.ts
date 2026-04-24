import { v4 as uuidv4 } from 'uuid';
import type { NotificationDTO, NotificationChannel } from './notification.dto';

export function createNotification(
    eventId: string,
    channel: NotificationChannel,
    recipient: string,
    body: string,
    subject?: string
): NotificationDTO {
    return {
        id: uuidv4(),
        eventId,
        channel,
        recipient,
        body,
        subject,
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0
    }
}