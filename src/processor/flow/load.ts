import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const LoadSchema = z.object({
  table: z.string(),
  mode: z.enum(["full-refresh", "incremental"]),
});

type LoadData = z.infer<typeof LoadSchema>;

export class LoadProcessor extends BaseProcessor<LoadData> {
  schema = LoadSchema;

  async handle(job: any): Promise<{ loaded: boolean; table: string; rowsLoaded: number }> {
    const data = job.data as LoadData;
    const childrenValues = (await job.getChildrenValues()) ?? {};

    const rowsLoaded = Object.values(childrenValues as Record<string, any>).reduce(
      (sum: number, val: any) => sum + (val?.rowsTransformed ?? 0),
      0,
    );

    logger.info(
      { table: data.table, mode: data.mode, rowsToLoad: rowsLoaded },
      "[Load] Starting load to destination"
    );

    await new Promise((r) => setTimeout(r, 1000));

    const result = {
      loaded: true,
      table: data.table,
      rowsLoaded,
    };

    logger.info({ table: data.table, rows: result.rowsLoaded }, "[Load] Completed");
    return result;
  }
}
