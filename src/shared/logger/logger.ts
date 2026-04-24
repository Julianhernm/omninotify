import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "../../config/env";
import path from "node:path";

const LEVEL_COLORS = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magneta',
    debug: 'blue'
}

winston.addColors(LEVEL_COLORS);

const devFormat = winston.format.combine(
    winston.format.timestamp({format: 'HH:mm:ss'}),
    winston.format.colorize({all: true}),
    winston.format.printf(({timestamp, level, message, ...meta}) => {
        const metaStr = Object.keys(meta).length
            ? `\n ${JSON.stringify(meta, null, 2)}`
            : ``;
        return `${timestamp} [${level}] ${message}${metaStr}`
    })
)

const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({stack: true}),
    winston.format.json()
)

function buildTransports(): winston.transport[] {
    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: env.nodeEnv === 'production' ? prodFormat : devFormat
        })
    ];

    if (env.nodeEnv === 'production') {
        transports.push(
            new DailyRotateFile({
                filename: path.join('logs', 'omninotify-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
                format: prodFormat
            })
        )
    };

    transports.push(
        new DailyRotateFile({
            filename: path.join('logs', 'omnotify-error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            maxSize: '20m',
            format: prodFormat
        })
    )

    return transports
}

export const logger = winston.createLogger({
    level: env.logLevel,
    levels: winston.config.npm.levels,
    transports: buildTransports(),
    exitOnError: false
})

export function createContextLogger(context: Record<string, unknown>) {
    return logger.child(context)
}