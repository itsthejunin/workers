import { BaseProcessor } from "@boilerplate/processor/base";
import { EmailProcessor, PdfProcessor, MetricsProcessor } from "@boilerplate/processor/examples";
import { JOBS } from "@boilerplate/shared/jobs";

// União de todos os tipos de processadores possíveis
type ProcessorInstance = EmailProcessor | PdfProcessor | MetricsProcessor;

export const processorRegistry: Record<string, ProcessorInstance> = {
  [JOBS.EMAIL.name]: new EmailProcessor(),
  [JOBS.PDF.name]: new PdfProcessor(),
  [JOBS.METRICS.name]: new MetricsProcessor(),
};

export function registerProcessor(name: string, processor: ProcessorInstance) {
  processorRegistry[name] = processor;
}
