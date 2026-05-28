import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const AiPublishSchema = z.object({
  topic: z.string().optional(),
  chainIndex: z.number().optional(),
});

type AiPublishData = z.infer<typeof AiPublishSchema>;

export class AiPublishProcessor extends BaseProcessor<AiPublishData> {
  schema = AiPublishSchema;

  async handle(job: any): Promise<{ publishedAt: string; articleId: string }> {
    const childrenValues = await job.getChildrenValues();

    logger.info(
      { childrenCount: Object.keys(childrenValues).length },
      "[AI Publish] Aggregating results and publishing"
    );

    await new Promise((r) => setTimeout(r, 1000));

    const result = {
      publishedAt: new Date().toISOString(),
      articleId: `article-${Date.now()}`,
    };

    logger.info(
      { articleId: result.articleId },
      "[AI Publish] Article published successfully"
    );

    return result;
  }
}
