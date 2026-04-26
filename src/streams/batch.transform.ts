import { Transform, TransformCallback, TransformOptions } from "node:stream";
import type { NotificationDTO } from "../domain/notification.dto";
import { createContextLogger } from "../shared/logger/logger";

interface BatchTransformOptions extends TransformOptions {
    batchSize: number
}

const log = createContextLogger({ service: 'BatchTransform'})
export class BatchTransform extends Transform {
    private batch: NotificationDTO[] = [];
    private readonly batchSize: number;
    private processedTotal: number = 0;

    constructor(options: BatchTransformOptions){
        super({...options, objectMode: true});
        this.batchSize = options.batchSize
    }

    _transform(
        notification: NotificationDTO,
        _encoding: BufferEncoding,
        callback: TransformCallback
    ): void {
        this.batch.push(notification);

        if(this.batch.length >= this.batchSize){
            this.flushBatch();
        }

        callback()
    }

    _flush(callback: TransformCallback): void {
        if(this.batch.length > 0){
            log.info(`flushings final batch of ${this.batch.length} items`);
            this.flushBatch();
        }
        log.info(`Total processed: ${this.processedTotal} notifications`);
        callback()
    }

    private flushBatch(): void {
        const currentBatch = [...this.batch]
        this.processedTotal += currentBatch.length;
        this.batch = [];

        log.info(`issuing a batch of ${currentBatch.length} notifications`);

        this.push(currentBatch)
    }
}