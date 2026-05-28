import Redis from 'ioredis';
import { env } from '../config';
import logger from './logger.ts';

let sharedConnection: Redis | null = null;
let connectionCount = 0;

export function getRedisConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    sharedConnection.on('connect', () => {
      logger.info('Redis connected');
    });

    sharedConnection.on('error', (err) => {
      logger.error({ error: err.message }, 'Redis connection error');
    });

    sharedConnection.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  connectionCount++;
  return sharedConnection;
}

export function getConnectionCount(): number {
  return connectionCount;
}

export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection) {
    connectionCount--;
    if (connectionCount <= 0) {
      logger.info('Closing Redis connection');
      await sharedConnection.quit();
      sharedConnection = null;
    }
  }
}
