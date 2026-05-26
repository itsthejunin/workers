import { Job } from "bullmq";
import { z } from "zod";

export abstract class BaseProcessor<T = any> {
  abstract schema: z.ZodSchema<T>;
  abstract handle(job: Job<T>): Promise<void>;

  async validateAndHandle(job: Job<T>): Promise<void> {
    const data = this.schema.parse(job.data);
    return this.handle({ ...job, data });
  }
}
