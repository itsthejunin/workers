import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const CheckPrefsSchema = z.object({
  userId: z.string(),
});

type CheckPrefsData = z.infer<typeof CheckPrefsSchema>;

export class CheckPreferencesProcessor extends BaseProcessor<CheckPrefsData> {
  schema = CheckPrefsSchema;

  async handle(job: any): Promise<{ emailEnabled: boolean; pushEnabled: boolean }> {
    const data = job.data as CheckPrefsData;

    logger.info({ userId: data.userId }, "[Check Preferences] Checking user notification preferences");

    await new Promise((r) => setTimeout(r, 500));

    const result = {
      emailEnabled: true,
      pushEnabled: true,
    };

    logger.info(result, "[Check Preferences] Completed");
    return result;
  }
}
