import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // Feature flags
  FEATURE_TELEMETRY: z.string().optional(),
  FEATURE_METRICS_ENDPOINT: z.string().optional(),
  FEATURE_CRON_JOBS: z.string().optional(),
  FEATURE_RATE_LIMITING: z.string().optional(),
  FEATURE_JOB_DEDUP: z.string().optional(),
  FEATURE_WORKER_HEARTBEAT: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_POINTS: z.coerce.number().positive().default(100),
  RATE_LIMIT_DURATION: z.coerce.number().positive().default(900),

  // Job defaults
  DEFAULT_JOB_ATTEMPTS: z.coerce.number().nonnegative().default(3),
  DEFAULT_JOB_BACKOFF_DELAY: z.coerce.number().nonnegative().default(1000),
  DEFAULT_JOB_TIMEOUT: z.coerce.number().nonnegative().default(30000),

  // Health check
  HEALTH_CHECK_INTERVAL: z.coerce.number().positive().default(30000),
});

export type Config = z.infer<typeof configSchema>;
