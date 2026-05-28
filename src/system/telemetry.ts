import os from 'os';
import { getRedisConnection } from '../utils/redis-connection';
import logger from '../utils/logger.ts';

export interface WorkerTelemetry {
  workerId: string;
  hostname: string;
  queues: string[];
  uptimeSeconds: number;
  hardware: {
    cpuLoadAvg: number[];
    memoryUsageMB: number;
    memoryTotalSystemMB: number;
  };
  lastHeartbeat: string;
}

const workerId = `worker-${os.hostname()}-${process.pid}`;

export function startTelemetryReporter(queuesListening: string[], intervalMs = 15000) {
  logger.info(`Starting telemetry reporter for ${workerId}`);

  const report = async () => {
    try {
      const redis = getRedisConnection();
      const telemetry: WorkerTelemetry = {
        workerId,
        hostname: os.hostname(),
        queues: queuesListening,
        uptimeSeconds: Math.floor(process.uptime()),
        hardware: {
          cpuLoadAvg: os.loadavg(),
          memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          memoryTotalSystemMB: Math.round(os.totalmem() / 1024 / 1024),
        },
        lastHeartbeat: new Date().toISOString(),
      };

      const key = `telemetry:worker:${workerId}`;
      const ttlSeconds = Math.ceil((intervalMs * 2) / 1000);

      await redis.set(key, JSON.stringify(telemetry), 'EX', ttlSeconds);
    } catch (error) {
      logger.error({ error: String(error) }, 'Failed to report telemetry');
    }
  };

  report();
  const timer = setInterval(report, intervalMs);

  return () => clearInterval(timer);
}
