import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const SendEmailSchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
});

type SendEmailData = z.infer<typeof SendEmailSchema>;

export class SendEmailProcessor extends BaseProcessor<SendEmailData> {
  schema = SendEmailSchema;

  async handle(job: any): Promise<{ sent: boolean; channel: string; messageId: string }> {
    const data = job.data as SendEmailData;

    logger.info({ userId: data.userId, title: data.title }, "[Send Email] Sending email notification");

    await new Promise((r) => setTimeout(r, 1000));

    const result = {
      sent: true,
      channel: "email",
      messageId: `email-${Date.now()}`,
    };

    logger.info({ messageId: result.messageId }, "[Send Email] Email sent");
    return result;
  }
}
