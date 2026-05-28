import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const ExtractSchema = z.object({
  source: z.string(),
  entity: z.string(),
});

type ExtractData = z.infer<typeof ExtractSchema>;

export class ExtractProcessor extends BaseProcessor<ExtractData> {
  schema = ExtractSchema;

  async handle(job: any): Promise<{ recordsExtracted: number; entity: string }> {
    const data = job.data as ExtractData;

    logger.info({ source: data.source, entity: data.entity, jobId: job.id }, "[Extract] Starting extraction");

    const delay = data.entity === "orders" ? 3000 : 1500;
    await new Promise((r) => setTimeout(r, delay));

    const result = {
      recordsExtracted: Math.floor(Math.random() * 100) + 10,
      entity: data.entity,
    };

    logger.info({ entity: data.entity, records: result.recordsExtracted }, "[Extract] Completed");
    return result;
  }
}
