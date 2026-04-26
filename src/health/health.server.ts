import http from "http";
import { healthService } from "./health.service";
import { logger } from "../shared/logger/logger";
import { env } from "../config/env";

export function startHealthServer(): http.Server {
    const server = http.createServer(async (req, res) => {
        if (req.url === '/health/' && req.method === 'GET') {
            try {
                const report = await healthService.check();

                const statusCode =
                    report.status === 'healthy' ? 200 :
                        report.status === 'degraded' ? 200 : //degraded continues receiving trafic
                            503                              // unhealthy reject trafic

                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(report, null, 2));
            } catch (error) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'unhealthy', error: 'Health check failed' }));
            }
            return;
        }

        if (req.url === '/ready/' && req.method === 'GET') {
            //Readiness: is it ready to receive trafic?
            //Different from liveness: is it alive?
            const report = await healthService.check();
            const isReady = report.status !== "unhealthy"

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: isReady ? 'ready' : 'not_ready'
            }));
            return;
        }

        res.writeHead(404);
        res.end();
    })

    server.listen(env.port,'0.0.0.0', () => {
        logger.info(`Health server is listening on port ${env.port}`);
    });
    return server
}