import { BaseProcessor } from "../processor/base";
import { EmailProcessor, PdfProcessor, MetricsProcessor } from "../processor/examples";

export const processorRegistry: Record<string, BaseProcessor> = {
  "send-email": new EmailProcessor(),
  "process-pdf": new PdfProcessor(),
  "sync-metrics": new MetricsProcessor(),
};

export function registerProcessor(name: string, processor: BaseProcessor) {
  processorRegistry[name] = processor;
}
