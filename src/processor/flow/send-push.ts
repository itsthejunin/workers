import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const SendPushSchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
});

type SendPushData = z.infer<typeof SendPushSchema>;

export class SendPushProcessor extends BaseProcessor<SendPushData> {
  schema = SendPushSchema;

  async handle(job: any): Promise<{ sent: boolean; channel: string; messageId: string }> {
    const data = job.data as SendPushData;

    logger.info({ userId: data.userId, title: data.title }, "[Send Push] Sending push notification");

    await new Promise((r) => setTimeout(r, 800));

    const result = {
      sent: true,
      channel: "push",
      messageId: `push-${Date.now()}`,
    };

    logger.info({ messageId: result.messageId }, "[Send Push] Push sent");
    return result;
  }
}
