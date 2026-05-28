import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../../utils/logger";

const TransformSchema = z.object({
  table: z.string(),
  mode: z.enum(["full-refresh", "incremental"]),
});

type TransformData = z.infer<typeof TransformSchema>;

export class TransformProcessor extends BaseProcessor<TransformData> {
  schema = TransformSchema;

  async handle(job: any): Promise<{ rowsTransformed: number; table: string }> {
    const data = job.data as TransformData;
    const childrenValues = (await job.getChildrenValues()) ?? {};

    const extractedRecords = Object.values(childrenValues as Record<string, any>).reduce(
      (sum: number, val: any) => sum + (val?.recordsExtracted ?? 0),
      0,
    );

    logger.info(
      { table: data.table, mode: data.mode, inputRecords: extractedRecords },
      "[Transform] Starting transformation"
    );

    await new Promise((r) => setTimeout(r, 2500));

    const result = {
      rowsTransformed: extractedRecords,
      table: data.table,
    };

    logger.info({ rows: result.rowsTransformed }, "[Transform] Completed");
    return result;
  }
}
