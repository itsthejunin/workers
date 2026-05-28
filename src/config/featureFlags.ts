import { env } from './index';

export interface FeatureFlags {
  enableTelemetry: boolean;
  enableMetricsEndpoint: boolean;
  enableCronJobs: boolean;
  enableRateLimiting: boolean;
  enableJobDeduplication: boolean;
  enableWorkerHeartbeat: boolean;
}

export function loadFeatureFlags(): FeatureFlags {
  return {
    enableTelemetry: env.FEATURE_TELEMETRY !== 'false',
    enableMetricsEndpoint: env.FEATURE_METRICS_ENDPOINT === 'true',
    enableCronJobs: env.FEATURE_CRON_JOBS !== 'false',
    enableRateLimiting: env.FEATURE_RATE_LIMITING !== 'false',
    enableJobDeduplication: env.FEATURE_JOB_DEDUP === 'true',
    enableWorkerHeartbeat: env.FEATURE_WORKER_HEARTBEAT !== 'false',
  };
}

export const featureFlags = loadFeatureFlags();
