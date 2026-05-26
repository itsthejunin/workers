import { Queue } from 'bullmq';
import { env } from '../config';
import logger from '../utils/logger.ts';

/**
 * Queue configuration
 */
export interface QueueConfig {
  name: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    removeOnComplete?: boolean;
    removeOnFail?: number; // Keep this many failed jobs
  };
}

/**
 * Default queue configuration
 */
const defaultQueueConfig: QueueConfig = {
  name: '',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1 second
    },
    removeOnComplete: true, // Remove successful jobs to keep Redis clean
    removeOnFail: 1000, // Keep up to 1000 failed jobs for inspection
  },
};

/**
 * Initialize a BullMQ queue with the given configuration
 */
export function initQueue(config: QueueConfig): Queue {
  const { name, defaultJobOptions } = { ...defaultQueueConfig, ...config };
  const connection = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  };

  logger.info(`Initializing queue: ${name}`, { host: env.REDIS_HOST, port: env.REDIS_PORT });

  return new Queue(name, {
    connection,
    defaultJobOptions,
  });
}

/**
 * Initialize all queues used by the application
 */
export function initAllQueues(): Record<string, Queue> {
  const queues = {
    email: initQueue({ name: 'email-queue' }),
    documents: initQueue({ name: 'doc-queue' }),
    metrics: initQueue({ name: 'metrics-queue' }),
  };

  logger.info('All queues initialized', { queueNames: Object.keys(queues) });
  return queues;
}