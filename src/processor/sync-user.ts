import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../utils/logger.ts";

// 1. Define the schema for the job data
export const SyncUserProcessorSchema = z.object({
  id: z.string(),
  // add more fields here
});

// 2. Export the inferred type
export type SyncUserProcessorData = z.infer<typeof SyncUserProcessorSchema>;

// 3. Implement the processor
export class SyncUserProcessor extends BaseProcessor<SyncUserProcessorData> {
  schema = SyncUserProcessorSchema;

  async handle(job: any): Promise<void> {
    const data = job.data as SyncUserProcessorData;

    logger.info({ jobId: job.id, data }, `[SyncUserProcessor] Processing job`);

    // Add your business logic here
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info({ jobId: job.id }, `[SyncUserProcessor] Successfully processed job`);
  }
}
