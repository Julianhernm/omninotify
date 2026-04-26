import { publisherClient } from "../worker/redis.client";

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface ComponentHealth {
    status: HealthStatus;
    latencyMs?: number;
    memoryMB?: number;
    error?: string;
}

interface HealthReport {
    status: HealthStatus;
    timestamp: string;
    uptime: number;
    components: {
        redis: ComponentHealth;
        memory: ComponentHealth
    }
}

export class HealthService {
    async check(): Promise<HealthReport> {
        const [redis, memory] = await Promise.all([
            this.checkRedis(),
            this.checkMemory(),
        ]);

        const statuses = [redis.status, memory.status];
        const overall: HealthStatus =
            statuses.includes('unhealthy') ? 'unhealthy' :
                statuses.includes('degraded') ? 'degraded' :
                    'healthy';

        return {
            status: overall,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            components: { redis, memory }
        }
    }

    private async checkRedis(): Promise<ComponentHealth> {
        const start = Date.now();
        try {
            await publisherClient.ping();
            const latencyMs = Date.now() - start;

            return {
                status: latencyMs > 100 ? 'degraded' : 'healthy',
                latencyMs
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Redis unreachable'
            }
        }
    }

    private checkMemory(): ComponentHealth {
        const used = process.memoryUsage();
        const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
        const usagePercent = (used.heapUsed / used.heapTotal) * 100;

        return {
            status: usagePercent > 90 ? 'unhealthy' :
                usagePercent > 75 ? 'degraded' :
                    'healthy',
            memoryMB: heapTotalMB
        }
    }
}

export const healthService = new HealthService();