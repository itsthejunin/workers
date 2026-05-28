import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const FormatMessageSchema = z.object({
  title: z.string(),
  body: z.string(),
  channel: z.string().optional(),
});

type FormatMessageData = z.infer<typeof FormatMessageSchema>;

export class FormatMessageProcessor extends BaseProcessor<FormatMessageData> {
  schema = FormatMessageSchema;

  async handle(job: any): Promise<{ formattedTitle: string; formattedBody: string }> {
    const data = job.data as FormatMessageData;

    logger.info({ channel: data.channel }, "[Format Message] Formatting notification message");

    await new Promise((r) => setTimeout(r, 300));

    const result = {
      formattedTitle: `[${data.channel?.toUpperCase()}] ${data.title}`,
      formattedBody: data.body,
    };

    logger.info({ channel: data.channel }, "[Format Message] Completed");
    return result;
  }
}
