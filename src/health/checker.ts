import { Queue } from 'bullmq';
import { getRedisConnection } from '../utils/redis-connection';

export interface HealthCheckResult {
  redis: {
    status: 'ok' | 'error';
    latency?: number;
    error?: string;
  };
  queues: Record<string, {
    status: 'ok' | 'error';
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
    error?: string;
  }>;
  timestamp: number;
}

export async function performHealthCheck(
  _redisConfig: { host: string; port: number },
  queues: Record<string, Queue>
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    redis: { status: 'ok' },
    queues: {},
    timestamp: Date.now(),
  };

  try {
    const redis = getRedisConnection();
    await redis.ping();
    result.redis.latency = Date.now() - startTime;
  } catch (err) {
    result.redis.status = 'error';
    result.redis.error = err instanceof Error ? err.message : String(err);
  }

  for (const [name, queue] of Object.entries(queues)) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      result.queues[name] = { status: 'ok', waiting, active, completed, failed, delayed };
    } catch (err) {
      result.queues[name] = {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return result;
}
