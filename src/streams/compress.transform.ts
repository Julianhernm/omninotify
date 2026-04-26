import { Transform, TransformCallback } from "node:stream";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { createContextLogger } from "../shared/logger/logger";

const log = createContextLogger({ service: 'CompressTransform'})
const gzipAsync = promisify(gzip);

export class CompressTransform extends Transform {
    constructor(){
        super()
    }

    async _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): Promise<void> {
        try {
            log.info(`Input: ${chunk.length}, bytes`);

            const compressed = await gzipAsync(chunk);

            log.info(`Output: ${compressed.length} bytes`);
            log.info(`Ratio: ${((1 - compressed.length / chunk.length) * 100).toFixed(1)}%`)

            this.push(compressed);
            callback()
        } catch (error) {
            callback(error instanceof Error ? error: new Error(String(error)))
        }
    }
}