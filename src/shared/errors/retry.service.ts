import { isAppError } from "./app.error";

interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 5000,
    maxDelayMs: 10_000
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error = new Error('Unkown error')

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (isAppError(error) && !error.retryable){
                throw error;
            }
            if (attempt > config.maxRetries) {
                break
            }

            const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 200;
            const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

            config.onRetry?.(attempt, lastError, Math.round(delay));
            await sleep(delay)
        }
    }
    throw lastError
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}