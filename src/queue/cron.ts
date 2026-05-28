import { Queue } from 'bullmq';
import { featureFlags } from '../config/featureFlags';
import logger from '../utils/logger.ts';

export async function setupCronJobs(queues: Record<string, Queue>) {
  if (!featureFlags.enableCronJobs) {
    logger.info('Cron jobs disabled by feature flag');
    return;
  }

  logger.info('Setting up cron jobs...');

  try {
    if (queues['metrics-queue']) {
      await queues['metrics-queue'].add(
        'sync-metrics',
        { value: 100 },
        {
          repeat: {
            pattern: '0 0 * * *',
          },
          jobId: 'daily-metrics-sync-cron',
        }
      );
      logger.info('Registered daily metrics sync cron job');
    }
  } catch (error) {
    logger.error({ error: String(error) }, 'Failed to setup cron jobs');
  }
}
