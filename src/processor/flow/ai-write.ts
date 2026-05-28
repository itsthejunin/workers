import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const AiWriteSchema = z.object({
  topic: z.string().optional(),
  tone: z.string().optional(),
  maxWords: z.number().optional(),
  chainIndex: z.number().optional(),
});

type AiWriteData = z.infer<typeof AiWriteSchema>;

export class AiWriteProcessor extends BaseProcessor<AiWriteData> {
  schema = AiWriteSchema;

  async handle(job: any): Promise<{ content: string; wordCount: number }> {
    const data = job.data as AiWriteData;

    const childrenValues = await job.getChildrenValues?.();

    logger.info({ topic: data.topic, jobId: job.id }, "[AI Write] Starting content writing");

    await new Promise((r) => setTimeout(r, 3000));

    const content = `# ${data.topic}

This is generated content about "${data.topic}" in a ${data.tone ?? "professional"} tone.

## Introduction
Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Main Body
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Conclusion
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.`;

    const result = {
      content,
      wordCount: content.split(/\s+/).length,
    };

    logger.info({ wordCount: result.wordCount }, "[AI Write] Completed");
    return result;
  }
}
