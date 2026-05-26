import { Worker, WorkerOptions } from "bullmq";
import { processorRegistry } from "../registry";

export interface QueueConfig {
  name: string;
  connection: any;
  workerOptions?: WorkerOptions;
}

export function createWorker(config: QueueConfig) {
  return new Worker(
    config.name,
    async (job) => {
      const processor = processorRegistry[job.name];
      if (!processor) {
        throw new Error(`No processor registered for job: ${job.name}`);
      }
      return processor.handle(job);
    },
    config.workerOptions
  );
}
