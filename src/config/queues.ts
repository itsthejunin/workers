import { z } from 'zod';

const queueSchema = z.object({
  workerConcurrency: z.number().positive().optional(),
  attempts: z.number().nonnegative().optional(),
  backoffType: z.enum(['fixed', 'exponential']).optional(),
  backoffDelay: z.number().nonnegative().optional(),
  removeOnComplete: z.boolean().optional(),
  removeOnFail: z.number().nonnegative().optional(),
  priority: z.number().nonnegative().optional(),
  dedupTtlMs: z.number().nonnegative().optional(),
});

export interface QueueConfig {
  name: string;
  workerConcurrency: number;
  attempts: number;
  backoff: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete: boolean;
  removeOnFail: number;
  priority?: number;
  dedupTtlMs?: number;
}

export const defaultQueueConfigs: Record<string, QueueConfig> = {
  'email-queue': {
    name: 'email-queue',
    workerConcurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: 1000,
    priority: 5,
  },
  'doc-queue': {
    name: 'doc-queue',
    workerConcurrency: 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: 1000,
    priority: 10,
  },
  'metrics-queue': {
    name: 'metrics-queue',
    workerConcurrency: 10,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: 1000,
    priority: 1,
    dedupTtlMs: 60000,
  },
  // Flow queues (added dynamically as needed; these are registered for the workbench)
  'content-queue': {
    name: 'content-queue',
    workerConcurrency: 3,
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 500,
    priority: 5,
  },
  'pipeline-queue': {
    name: 'pipeline-queue',
    workerConcurrency: 2,
    attempts: 1,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
    priority: 3,
  },
  'notification-queue': {
    name: 'notification-queue',
    workerConcurrency: 10,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: 1000,
    priority: 1,
  },
};

export function loadQueueConfigs(): Record<string, QueueConfig> {
  const configs = { ...defaultQueueConfigs };

  const envConfig = process.env.QUEUES_CONFIG;
  if (envConfig) {
    try {
      const parsed: Record<string, unknown> = JSON.parse(envConfig);
      for (const [queueName, queueConfig] of Object.entries(parsed)) {
        if (!queueConfig || typeof queueConfig !== 'object') continue;

        const result = queueSchema.safeParse(queueConfig);
        if (!result.success) {
          console.error(`Invalid queue config for ${queueName}:`, result.error);
          continue;
        }

        const overrides = result.data;
        const existing = configs[queueName] ?? {
          name: queueName,
          workerConcurrency: 5,
          attempts: 3,
          backoff: { type: 'exponential' as const, delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 1000,
        };

        configs[queueName] = {
          ...existing,
          workerConcurrency: overrides.workerConcurrency ?? existing.workerConcurrency,
          attempts: overrides.attempts ?? existing.attempts,
          backoff: {
            type: overrides.backoffType ?? existing.backoff.type,
            delay: overrides.backoffDelay ?? existing.backoff.delay,
          },
          removeOnComplete: overrides.removeOnComplete ?? existing.removeOnComplete,
          removeOnFail: overrides.removeOnFail ?? existing.removeOnFail,
          priority: overrides.priority ?? existing.priority,
          dedupTtlMs: overrides.dedupTtlMs ?? existing.dedupTtlMs,
        };
      }
    } catch (e) {
      console.error('Failed to parse QUEUES_CONFIG:', e);
    }
  }

  return configs;
}
