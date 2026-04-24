import { Writable, WritableOptions } from "node:stream";
import type { NotificationDTO } from "../domain/notification.dto";
import type { NotificationService } from "../sevices/notification.service";

interface NotificationWriteableOptions extends WritableOptions {
    notificationService: NotificationService;
    onProgress?: (process: number) => void;
}

export class NotificationWritable extends Writable {
    private notificationService: NotificationService;
    private processedCount: number = 0;
    private readonly onProgress?: (process: number) => void;

    constructor(options: NotificationWriteableOptions) {
        super({ ...options, objectMode: true });
        this.notificationService = options.notificationService;
        this.onProgress = options.onProgress
    }

    async _write(
        batch: NotificationDTO[],
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ): Promise<void> {
        try {
            console.log(`[NotificationWritable] processing batch of ${batch.length} notification`);


            await Promise.allSettled(
                batch.map(n => this.notificationService.dispatch(n))
            )

            this.processedCount += batch.length;
            this.onProgress?.(this.processedCount);

            callback()
        } catch (error) {
            callback(error instanceof Error ? error : new Error(String(error)))
        }
    }
}