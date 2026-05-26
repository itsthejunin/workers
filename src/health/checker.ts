import Redis from 'ioredis';
import { Queue } from 'bullmq';
import logger from '../utils/logger.ts';

/**
 * Health check results
 */
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
    error?: string;
  }>;
  timestamp: number;
}

/**
 * Perform health checks on Redis and queues
 */
export async function performHealthCheck(
  redisConfig: { host: string; port: number },
  queues: Record<string, Queue>
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    redis: { status: 'ok' },
    queues: {},
    timestamp: Date.now(),
  };

  // Check Redis connection
  try {
    const redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000, // 1 second timeout for health check
    });

    await redis.ping();
    const latency = Date.now() - startTime;
    result.redis.latency = latency;
    redis.quit().catch(() => {}); // Best effort to close
  } catch (err) {
    result.redis.status = 'error';
    result.redis.error = err instanceof Error ? err.message : String(err);
  }

  // Check each queue
  for (const [name, queue] of Object.entries(queues)) {
    try {
      // Get queue stats (non-blocking, but note: this does a Redis call)
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      result.queues[name] = {
        status: 'ok',
        waiting,
        active,
        completed,
        failed,
      };
    } catch (err) {
      result.queues[name] = {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return result;
}