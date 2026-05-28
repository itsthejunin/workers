import { Job } from "bullmq";
import { z } from "zod";

export abstract class BaseProcessor<T, R = any> {
  abstract schema: z.ZodSchema<T>;
  abstract handle(job: Job<T>): Promise<R>;

  async validateAndHandle(job: Job<T>): Promise<R> {
    const data = this.schema.parse(job.data);
    return this.handle({ ...job, data } as Job<T>);
  }
}
