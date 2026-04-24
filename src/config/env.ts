import dotenv from 'dotenv';
dotenv.config();

function requiredEnv(key: string): string {
    const value = process.env[key];
    if(!value) {
        throw new Error(`Environment variable ${key} is required but not set.`);
    }
    return value;
}

export const env = {
    nodeEnv: (requiredEnv('NODE_ENV') ?? 'development') as 'development' | 'production' | 'test',
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD ?? undefined,},
    logLevel: process.env.LOG_LEVEL ?? 'info',
    } as const;