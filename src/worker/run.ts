import { Worker } from "bullmq";
import { processorRegistry } from "../registry";
import { featureFlags } from "../config/featureFlags";
import { getQueueConfigs } from "../queue/init";
import { getRedisConnection } from "../utils/redis-connection";
import { startTelemetryReporter } from "../system/telemetry";
import { recordJobStart, recordJobEnd } from "../metrics";
import logger from "../utils/logger.ts";

const connection = getRedisConnection();
const queueConfigs = getQueueConfigs();

const workers = Object.values(queueConfigs).map((config) => {
  const worker = new Worker(
    config.name,
    async (job) => {
      const processor = processorRegistry[job.name];
      if (!processor) throw new Error(`Processador ausente: ${job.name}`);

      recordJobStart(config.name);
      const startTime = Date.now();

      try {
        const result = await processor.validateAndHandle(job);
        const duration = Date.now() - startTime;
        recordJobEnd(config.name, true, duration);
        logger.info(
          { queue: config.name, jobId: job.id, durationMs: duration },
          `Job completed`
        );
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        recordJobEnd(config.name, false, duration);
        throw err;
      }
    },
    { connection: connection as any, concurrency: config.workerConcurrency }
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { queue: config.name, jobId: job?.id, error: err.message, attempt: job?.attemptsMade },
      `[DLQ] Job falhou após todas as tentativas`
    );
  });

  worker.on("error", (err) => {
    logger.error({ queue: config.name, error: err.message }, `[Worker Error]`);
  });

  return worker;
});

if (featureFlags.enableTelemetry) {
  const queueNames = Object.keys(queueConfigs);
  startTelemetryReporter(queueNames);
}

process.on("unhandledRejection", (err) => {
  logger.error({ error: String(err) }, "Unhandled Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ error: err.message }, "Uncaught Exception");
  process.exit(1);
});

const shutdown = async () => {
  logger.info("Worker fechando conexões...");
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
