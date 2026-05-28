import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const AiOutlineSchema = z.object({
  topic: z.string().optional(),
  chainIndex: z.number().optional(),
});

type AiOutlineData = z.infer<typeof AiOutlineSchema>;

export class AiOutlineProcessor extends BaseProcessor<AiOutlineData> {
  schema = AiOutlineSchema;

  async handle(job: any): Promise<{ sections: string[]; structure: string }> {
    const data = job.data as AiOutlineData;

    const childrenValues = await job.getChildrenValues?.();

    const researchSummary =
      childrenValues && Object.values(childrenValues).length > 0
        ? Object.values(childrenValues)[0]
        : null;

    logger.info(
      { researchReceived: !!researchSummary, jobId: job.id },
      "[AI Outline] Starting outline generation"
    );

    await new Promise((r) => setTimeout(r, 1500));

    const result = {
      sections: ["Introduction", "Main Body", "Conclusion"],
      structure: `Outline based on${researchSummary ? " research" : ""} for topic "${data.topic}"`,
    };

    logger.info({ sections: result.sections.length }, "[AI Outline] Completed");
    return result;
  }
}
