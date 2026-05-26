import { BaseProcessor } from "@boilerplate/processor/base";
import { JOBS } from "@boilerplate/shared/jobs";

export class EmailProcessor extends BaseProcessor<typeof JOBS.EMAIL.schema._type> {
  schema = JOBS.EMAIL.schema;
  async handle(job: any) {
    console.log(`[Email] Enviando para ${job.data.to}: ${job.data.subject}`);
    await new Promise(r => setTimeout(r, 1000));
  }
}

export class PdfProcessor extends BaseProcessor<typeof JOBS.PDF.schema._type> {
  schema = JOBS.PDF.schema;
  async handle(job: any) {
    console.log(`[PDF] Processando documento ${job.data.documentId}`);
    await new Promise(r => setTimeout(r, 3000));
  }
}

export class MetricsProcessor extends BaseProcessor<typeof JOBS.METRICS.schema._type> {
  schema = JOBS.METRICS.schema;
  async handle(job: any) {
    console.log(`[Metrics] Registrando métrica: ${job.data.value}`);
    await new Promise(r => setTimeout(r, 500));
  }
}
