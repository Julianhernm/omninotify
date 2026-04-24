import type { INotificationChannel } from "../domain/channel.interface";
import type { NotificationDTO } from "../domain/notification.dto";
import { createNotification } from "../domain/notification.factory";
import { notificationProducer } from "../worker/notification.producer";
import { EventName, EventPayloadMap, NotificationEvent } from "../domain/events.types";
import { createContextLogger } from "../shared/logger/logger";

const log = createContextLogger({ service: 'NotificationService' })

export class NotificationService {
    private channels: Map<string, INotificationChannel> = new Map();

    registerChannel(channel: INotificationChannel): void {
        this.channels.set(channel.name, channel);
        log.info(`Registered channel: ${channel.name}`);
    }

    async handleEvent<T extends EventName>(event: NotificationEvent<T>): Promise<void> {
        const notifications = this.buildNotifications(event);

        if (notifications.length === 0) {
            log.warn(`No notifications to send for event: ${event.name}`);
            return;
        }

        await notificationProducer.enqueueBatch(notifications);
    }

    private buildNotifications<T extends EventName>(event: NotificationEvent<T>): NotificationDTO[] {
        const results: NotificationDTO[] = [];
        const p = event.payload as EventPayloadMap[T];

        const email = (p as { email: string }).email;
        if (!email) return results;


        switch (event.name) {
            case 'user.registered': {
                const payload = p as EventPayloadMap['user.registered'];

                results.push(createNotification(
                    event.id, 'email', email,
                    `Hola ${payload.name}, bienvenido a OmniNotify. Tu cuenta fue creada exitosamente.`,
                    'Bienvenido a OmniNotify',
                ));

                results.push(createNotification(
                    event.id, 'sms', email,
                    `OmniNotify: Hola ${payload.name}, tu cuenta fue creada.`,
                ));

                results.push(createNotification(
                    event.id, 'push', email,
                    `Tu cuenta está lista`,
                    'Bienvenido',
                ));
                break;
            }

            case 'payment.completed': {
                const payload = p as EventPayloadMap['payment.completed'];

                results.push(createNotification(
                    event.id, 'email', email,
                    `Tu pago de ${payload.amount} ${payload.currency} fue procesado. ID: ${payload.transactionId}`,
                    'Confirmación de pago',
                ));

                results.push(createNotification(
                    event.id, 'sms', email,
                    `Pago de ${payload.amount} ${payload.currency} confirmado. ID: ${payload.transactionId}`,
                ));
                break;
            }

            case 'order.cancelled': {
                const payload = p as EventPayloadMap['order.cancelled'];

                results.push(createNotification(
                    event.id, 'email', email,
                    `Tu orden ${payload.orderId} fue cancelada. Motivo: ${payload.reason}`,
                    'Orden cancelada',
                ));
                break;
            }
        }

        return results;
    };

    async dispatch(notification: NotificationDTO): Promise<void> {
        const channel = this.channels.get(notification.channel);

        if(!channel) {
            log.error(`No channel found for ${notification.channel}`);
            return;
        }

        if (!channel.isAvailable()) {
            log.warn(`Channel ${channel.name} is not available. Marking notification as failed.`);
        }
        try {
            await channel.send(notification);
            log.info(`OK — ${notification.channel} → ${notification.recipient}`);
        } catch (error) {
            log.error(`Error sending notification via ${notification.channel}:`, error);  
            throw error;
        }
    }
}