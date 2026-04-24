import { Transform, TransformCallback, TransformOptions } from "node:stream";
import type { NotificationDTO } from "../domain/notification.dto";

interface BatchTransformOptions extends TransformOptions {
    batchSize: number
}

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
            console.log(`[BatchTransform] flushings final batch of ${this.batch.length} items`);
            this.flushBatch();
        }
        console.log(`[BatchTransform] Total processed: ${this.processedTotal} notifications`);
        callback()
    }

    private flushBatch(): void {
        const currentBatch = [...this.batch]
        this.processedTotal += currentBatch.length;
        this.batch = [];

        console.log(`[BatchTransform] issuing a batch of ${currentBatch.length} notifications`);

        this.push(currentBatch)
    }
}