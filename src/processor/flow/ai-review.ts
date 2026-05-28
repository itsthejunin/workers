import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const AiReviewSchema = z.object({
  chainIndex: z.number().optional(),
});

type AiReviewData = z.infer<typeof AiReviewSchema>;

export class AiReviewProcessor extends BaseProcessor<AiReviewData> {
  schema = AiReviewSchema;

  async handle(job: any): Promise<{ score: number; feedback: string; approved: boolean }> {
    const childrenValues = await job.getChildrenValues?.();

    logger.info({ hasContent: !!childrenValues && Object.keys(childrenValues).length > 0 }, "[AI Review] Starting review");

    await new Promise((r) => setTimeout(r, 2000));

    const result = {
      score: 85,
      feedback: "Content looks good. Minor improvements suggested for tone consistency.",
      approved: true,
    };

    logger.info({ score: result.score, approved: result.approved }, "[AI Review] Completed");
    return result;
  }
}
