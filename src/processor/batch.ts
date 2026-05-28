import { Job } from "bullmq";
import { z } from "zod";
import { BaseProcessor } from "./base";

export interface BatchProcessorConfig {
  maxBatchSize: number;
  maxWaitMs: number;
}

export abstract class BatchProcessor<T> extends BaseProcessor<T[]> {
  abstract schema: z.ZodSchema<T[]>;
  abstract handleBatch(jobs: Job<T>[]): Promise<void>;

  async handle(job: Job<T[]>): Promise<void> {
    const data = this.schema.parse(job.data);
    return this.handleBatch(data.map((item, index) => ({
      ...job,
      data: item,
      id: `${job.id}-${index}`,
    } as unknown as Job<T>)));
  }
}
