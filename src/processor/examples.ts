import { BaseProcessor } from "../processor/base";
import { z } from "zod";

export class EmailProcessor extends BaseProcessor<{ to: string, subject: string }> {
  schema = z.object({ to: z.string().email(), subject: z.string() });
  async handle(job: any) {
    console.log(`[Email] Enviando para ${job.data.to}: ${job.data.subject}`);
    await new Promise(r => setTimeout(r, 1000));
  }
}

export class PdfProcessor extends BaseProcessor<{ documentId: string }> {
  schema = z.object({ documentId: z.string() });
  async handle(job: any) {
    console.log(`[PDF] Processando documento ${job.data.documentId}`);
    await new Promise(r => setTimeout(r, 3000));
  }
}

export class MetricsProcessor extends BaseProcessor<{ value: number }> {
  schema = z.object({ value: z.number() });
  async handle(job: any) {
    console.log(`[Metrics] Registrando métrica: ${job.data.value}`);
    await new Promise(r => setTimeout(r, 500));
  }
}
