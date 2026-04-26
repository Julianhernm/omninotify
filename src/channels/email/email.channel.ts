import path from "path";
import type { INotificationChannel } from "../../domain/channel.interface";
import type { NotificationDTO } from "../../domain/notification.dto";
import { WorkerPool } from "../../worker/worker.pool";
import { isEmail } from "validator";
import { withRetry } from "../../shared/errors/retry.service";
import { deadLetterQueue } from "../../worker/dead-letter.queue";
import { createContextLogger } from "../../shared/logger/logger"
import {
    AppError,
    ChannelError,
    ErrorCode
} from "../../shared/errors/app.error"

interface WorkerInput {
    notification: NotificationDTO;
}

interface WorkerResult {
    success: boolean;
    notificationId: string;
    proccessedBody: string;
    durationMs: number;
    error?: string;
}

const log = createContextLogger({service: "EmailChannel"})

export class EmailChannel implements INotificationChannel {
    readonly name = 'email';
    private pool: WorkerPool<WorkerInput, WorkerResult>;

    constructor() {
        // Pool size = number of CPU cores - 1
        // We leave one core free for the main thread
        const poolSize = Math.max(1, (require('os').cpus().length - 1));
        this.pool = new WorkerPool<WorkerInput, WorkerResult>(
            path.join(process.cwd(), 'src/worker/email.worker.ts'),
            poolSize
        )
    }

    isAvailable(): boolean {
        return true
    }

    async send(notification: NotificationDTO): Promise<void> {
        if (!isEmail(notification.recipient)) {
            throw new ChannelError(
                ErrorCode.INVALID_RECIPIENT,
                `Email invalid: ${notification.recipient}`,
                false,
                this.name
            );
        }

        try {
            await withRetry(
                () => this.doSend(notification),
                {
                    maxRetries: 3,
                    baseDelayMs: 500,
                    onRetry: (attempt, error, delay) => {
                        log.warn(
                            `[EmailChanne] Retry ${attempt} for ${notification.id}`,
                            { error: error.message, nextRetryMs: delay }

                        )
                    }
                }
            )
        } catch (error) {

            await deadLetterQueue.push(
                notification,
                error instanceof Error ? error.message : "Error desconocido"
            );
            throw error
        }
    }
    private async doSend(notification: NotificationDTO): Promise<void> {
        const result = await this.pool.run({ notification });

        if (!result.success) {
            throw new ChannelError(
                ErrorCode.PROVIDER_ERROR,
                `Worker failure: ${result.error}`,
                true,
                this.name,
                { notification: notification.id }
            )
        }
        log.info(`[EmailChannel] sent to ${notification.recipient} in ${result.durationMs}ms`);
    }

    async destroy(): Promise<void> {
        await this.pool.destroy();
    }
}