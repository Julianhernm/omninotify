import { logger } from "./logger/logger";

type ShutdownHandler = () => Promise<void>;

class GracefulShutdown {
    private handlers: ShutdownHandler[] = [];
    private isShuttingDown: boolean = false;

    //Register function that must run when shutting down
    register(handler: ShutdownHandler): void {
        this.handlers.push(handler)
    }

    //Start the shutdown process
    async shutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        logger.info(`Signal received: ${signal}. Starting graceful shutdown...`);

        //Security Timeout - if it takes more than 10s, we force the shutdown
        const forceExit = setTimeout(() => {
            logger.error('Graceful shutdown take too logn. forcing clousure');
            process.exit(1);
        }, 10_000);

        try {
            //We run all handler in sequence
            for (const handler of this.handlers) {
                await handler()
            }

            clearTimeout(forceExit);
            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });

            clearTimeout(forceExit);
            process.exit(1)
        }
    }

    //Register the signal listeners of the OS
    listen(): void {
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('SIGINT', () => this.shutdown('SIGINT'));

        //Catches unhandled errors to prevent silent crashes
        process.on('uncaughtException', (error) => {
            logger.error('uncaughtException', { error: error.message, stack: error.stack});
            this.shutdown('uncaughtException')
        });

        process.on('unhandledRejection', (reason) => {
            logger.error('unhandledRejection', {
                reason: reason instanceof Error ? reason.message : String(reason)
            });
            this.shutdown('unhandledRejection')
        })

    }
}

export const gracefulShutdown = new GracefulShutdown();