import { BaseProcessor } from "@boilerplate/processor/base";
import { JOBS } from "@boilerplate/shared/jobs";
import { z } from "zod";
import logger from "../utils/logger.ts";

export class EmailProcessor extends BaseProcessor<z.infer<typeof JOBS.EMAIL.schema>> {
  schema = JOBS.EMAIL.schema;

  async handle(job: any) {
    logger.info(
      { jobName: job.name, to: job.data.to, subject: job.data.subject },
      `[Email] Enviando email`
    );
    await new Promise(r => setTimeout(r, 1000));
  }
}

export class PdfProcessor extends BaseProcessor<z.infer<typeof JOBS.PDF.schema>> {
  schema = JOBS.PDF.schema;

  async handle(job: any) {
    logger.info(
      { jobName: job.name, documentId: job.data.documentId },
      `[PDF] Processando documento`
    );
    await new Promise(r => setTimeout(r, 3000));
  }
}

export class MetricsProcessor extends BaseProcessor<z.infer<typeof JOBS.METRICS.schema>> {
  schema = JOBS.METRICS.schema;

  async handle(job: any) {
    logger.info(
      { jobName: job.name, value: job.data.value },
      `[Metrics] Registrando métrica`
    );
    await new Promise(r => setTimeout(r, 500));
  }
}
