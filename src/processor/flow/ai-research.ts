import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const AiResearchSchema = z.object({
  topic: z.string(),
  tone: z.string().optional(),
});

type AiResearchData = z.infer<typeof AiResearchSchema>;

export class AiResearchProcessor extends BaseProcessor<AiResearchData> {
  schema = AiResearchSchema;

  async handle(job: any): Promise<{ sources: string[]; summary: string }> {
    const data = job.data as AiResearchData;

    logger.info({ topic: data.topic, jobId: job.id }, "[AI Research] Starting research");

    await new Promise((r) => setTimeout(r, 2000));

    const result = {
      sources: [`source-1-${data.topic}`, `source-2-${data.topic}`],
      summary: `Research summary for "${data.topic}" with ${data.tone ?? "professional"} tone`,
    };

    logger.info({ topic: data.topic, sources: result.sources.length }, "[AI Research] Completed");
    return result;
  }
}
