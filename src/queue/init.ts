import { Queue } from 'bullmq';
import { loadQueueConfigs, type QueueConfig } from '../config/queues';
import { getRedisConnection } from '../utils/redis-connection';
import logger from '../utils/logger.ts';

function initQueue(config: QueueConfig): Queue {
  const connection = getRedisConnection();

  logger.info(
    { queue: config.name, concurrency: config.workerConcurrency, priority: config.priority },
    `Initializing queue: ${config.name}`
  );

  return new Queue(config.name, {
    connection: connection as any,
    defaultJobOptions: {
      attempts: config.attempts,
      backoff: config.backoff,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
      priority: config.priority,
    },
  });
}

export function initAllQueues(): Record<string, Queue> {
  const queueConfigs = loadQueueConfigs();
  const queues: Record<string, Queue> = {};

  for (const [queueName, config] of Object.entries(queueConfigs)) {
    queues[queueName] = initQueue(config);
  }

  logger.info({ queueNames: Object.keys(queues) }, 'All queues initialized');
  return queues;
}

export function getQueueConfigs(): Record<string, QueueConfig> {
  return loadQueueConfigs();
}
