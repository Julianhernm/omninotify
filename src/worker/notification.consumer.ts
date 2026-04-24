import { publisherClient, subscriberClient } from "./redis.client";
import { QUEUES, type QueueName } from "./queue.constants";
import type { NotificationDTO } from "../domain/notification.dto";
import { AppError } from "../shared/errors/app.error";
import { deadLetterQueue } from "./dead-letter.queue";
import { createContextLogger } from "../shared/logger/logger";

type MessageHandler = (notification: NotificationDTO) => Promise<void>;

const log = createContextLogger({ service: 'NotificationConsumer' })

export class NotificationConsumer {
    private isRuning: boolean = false;
    private handlers: Map<QueueName, MessageHandler> = new Map();

    registerHanddler(queue: QueueName, handler: MessageHandler): void {
        this.handlers.set(queue, handler);
        log.info(`Registered handler for queue: ${queue}`);
    }

    async start(): Promise<void> {
        if (this.isRuning) return;
        this.isRuning = true;

        const queues = Object.values(QUEUES);
        log.info(`Starting consumer for queues: ${queues.join(', ')}`);

        this.poll(queues);
    };

    stop(): void {
        this.isRuning = false;
        subscriberClient.disconnect();
        log.info('Consumer stopped and Redis connection closed');
    }

    private async poll(queues: Array<string>): Promise<void> {
        while (this.isRuning) {
            try {
                const result = await subscriberClient.brpop(...queues, 5);

                if (!result) continue;

                const [queueName, rawMessage] = result;
                await this.proccessMesage(queueName as QueueName, rawMessage)

            } catch (error) {
                log.error('Error while polling queues:', error);
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    }

    private async proccessMesage(queue: QueueName, raw: string): Promise<void> {
        let notification: NotificationDTO;

        try {
            notification = JSON.parse(raw) as NotificationDTO;
        } catch (error) {
            log.error(`Failed to parse message from queue ${queue}:`, error);
            return;
        }

        const handler = this.handlers.get(queue);

        if (!handler) {
            log.warn(`No handler registered for queue ${queue}, skipping message ${notification.id}`);
            return;
        }

        try {
            await handler(notification);
        } catch (error) {
            const isRetryable = error instanceof AppError ? error.retryable : true

            if (isRetryable && notification.retryCount < 3) {
                notification.retryCount += 1;
                notification.status = "retrying";
                await publisherClient.rpush(queue, JSON.stringify(notification));
                log.warn(
                    `[Consumer] attemp ${notification.retryCount}/3`,
                    { id: notification.id }
                )
            } else {
                notification.status = "failed";
                await deadLetterQueue.push(
                    notification,
                    error instanceof Error ? error.message : "Unknown error"
                )
            }
        }

    }
}

export const notificationConsumer = new NotificationConsumer();