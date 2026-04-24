import { publisherClient } from "./redis.client";
import { QUEUES } from "./queue.constants";
import type { NotificationDTO } from "../domain/notification.dto";

export class NotificationProducer {
    async enqueue(notification: NotificationDTO): Promise<void> {
        const queue =  this.resolveQueue(notification.channel);
        const serialized = JSON.stringify(notification);

        await publisherClient.lpush(queue, serialized)

        console.log(`Enqueued notification ${notification.id} to ${queue}`);
    }

    async enqueueBatch(notifications: NotificationDTO[]): Promise<void> {
        if (notifications.length === 0) return;

        const pipeline = publisherClient.pipeline();

        for (const notification of notifications) {
            const queue = this.resolveQueue(notification.channel);
            pipeline.lpush(queue, JSON.stringify(notification));
        }

        await pipeline.exec();
        console.log(`Enqueued batch of ${notifications.length} notifications`);
    }

    private resolveQueue(channel: string): string {
        const map: Record<string, string>= {
            email: QUEUES.EMAIL,
            sms: QUEUES.SMS,
            push: QUEUES.PUSH,
        }

        const queue = map[channel];
        if(!queue) throw new Error(`Unsupported notification channel: ${channel}`);
        return queue
    }
}

export const notificationProducer = new NotificationProducer();