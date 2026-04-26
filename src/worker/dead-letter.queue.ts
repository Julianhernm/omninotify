import { publisherClient } from "./redis.client";
import type { NotificationDTO } from "../domain/notification.dto";
import { createContextLogger } from "../shared/logger/logger";

const log = createContextLogger({ service: 'DLQ' })
const DLQ_KEY = 'omninotify:dlq';
const DLQ_MAX_SIZE = 10_000;

export interface DeadLetter {
    notification: NotificationDTO;
    failedAt: string;
    reason: string;
    attemps: number
}

export class DeadLetterQueue {
    async push(
        notification: NotificationDTO,
        reason: string
    ): Promise<void> {
        const enty: DeadLetter = {
            notification,
            failedAt: new Date().toISOString(),
            reason,
            attemps: notification.retryCount
        }

        const pipeline = publisherClient.pipeline();
        pipeline.lpush(DLQ_KEY, JSON.stringify(enty));
        pipeline.ltrim(DLQ_KEY, 0, DLQ_MAX_SIZE - 1);
        await pipeline.exec()

        log.error(
            'Notification sent to dead letter queue',
            {
                id: notification.id,
                channel: notification.channel,
                recipient: notification.recipient,
                reason
            }
        )
    }

    async size(): Promise<number> {
        return publisherClient.llen(DLQ_KEY)
    }

    async peek(count: number = 10): Promise<DeadLetter[]> {
        const items = await publisherClient.lrange(DLQ_KEY, 0, count - 1);
        return items.map(item => JSON.parse(item) as DeadLetter)
    }
}

export const deadLetterQueue = new DeadLetterQueue()