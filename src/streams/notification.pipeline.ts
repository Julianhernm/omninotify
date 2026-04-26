import { pipeline } from "node:stream/promises";
import type { NotificationDTO } from "../domain/notification.dto";
import type { NotificationService } from "../sevices/notification.service";
import { NotificationReadable } from "./notification.readable";
import { BatchTransform } from "./batch.transform";
import { NotificationWritable } from "./notification.writeable";
import { createContextLogger } from "../shared/logger/logger";

interface PipelineOptions {
    notifications: Array<NotificationDTO>;
    notificationService: NotificationService;
    batchSize?: number;
    onProgress?: (processed: number) => void;
}

const log = createContextLogger({ service: 'Pipeline' })

export async function runNotificationPipeline(options: PipelineOptions) {
    const {
        notifications,
        notificationService,
        batchSize = 10,
        onProgress
    } = options
    const startTime = Date.now();

    const readable = new NotificationReadable({
        notifications,
        batchDelay: 5
    });

    const transform = new BatchTransform({ batchSize })
    const writable = new NotificationWritable({
        notificationService,
        onProgress
    });

    await pipeline(readable, transform, writable);

    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms`)
}   