import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../shared/logger/logger";

function createRedisClient(name: string) {
    const client = new Redis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password,
        db: parseInt(process.env.REDIS_DB ?? '0', 10),
        retryStrategy(times) {
            const delay = Math.min(times * 200 * 3000)
            return delay;
        },
        maxRetriesPerRequest: null,
        lazyConnect: true,
    })

    client.on('connect', () => {
        logger.debug(`Redis client "${name}" connected`);
    });

    client.on('error', (err) => {
        logger.error(`Redis client "${name}" error:`, err);
    });

    client.on('close', () => {
        logger.debug(`Redis client "${name}" closed`);
    });

    return client;
}

export const publisherClient = createRedisClient('publisher');
export const subscriberClient = createRedisClient('subscriber');