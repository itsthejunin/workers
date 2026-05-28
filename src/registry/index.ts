import type { BaseProcessor } from "@boilerplate/processor/base";
import { EmailProcessor, PdfProcessor, MetricsProcessor } from "@boilerplate/processor/examples";
import { AiResearchProcessor } from "@boilerplate/processor/flow/ai-research";
import { AiOutlineProcessor } from "@boilerplate/processor/flow/ai-outline";
import { AiWriteProcessor } from "@boilerplate/processor/flow/ai-write";
import { AiReviewProcessor } from "@boilerplate/processor/flow/ai-review";
import { AiPublishProcessor } from "@boilerplate/processor/flow/ai-publish";
import { ExtractProcessor } from "@boilerplate/processor/flow/extract";
import { TransformProcessor } from "@boilerplate/processor/flow/transform";
import { LoadProcessor } from "@boilerplate/processor/flow/load";
import { CheckPreferencesProcessor } from "@boilerplate/processor/flow/check-prefs";
import { FormatMessageProcessor } from "@boilerplate/processor/flow/format-message";
import { SendEmailProcessor as FlowSendEmailProcessor } from "@boilerplate/processor/flow/send-email";
import { SendPushProcessor } from "@boilerplate/processor/flow/send-push";
import { JOBS } from "@boilerplate/shared/jobs";

type ProcessorInstance = BaseProcessor<any, any>;

export const processorRegistry: Record<string, ProcessorInstance> = {
  [JOBS.EMAIL.name]: new EmailProcessor(),
  [JOBS.PDF.name]: new PdfProcessor(),
  [JOBS.METRICS.name]: new MetricsProcessor(),
  // AI Content Flow
  [JOBS.AI_RESEARCH.name]: new AiResearchProcessor(),
  [JOBS.AI_OUTLINE.name]: new AiOutlineProcessor(),
  [JOBS.AI_WRITE.name]: new AiWriteProcessor(),
  [JOBS.AI_REVIEW.name]: new AiReviewProcessor(),
  [JOBS.AI_PUBLISH.name]: new AiPublishProcessor(),
  // Data Pipeline
  "extract-users": new ExtractProcessor(),
  "extract-orders": new ExtractProcessor(),
  "extract-products": new ExtractProcessor(),
  [JOBS.TRANSFORM.name]: new TransformProcessor(),
  [JOBS.LOAD.name]: new LoadProcessor(),
  // Notification
  [JOBS.CHECK_PREFS.name]: new CheckPreferencesProcessor(),
  [JOBS.FORMAT_MESSAGE.name]: new FormatMessageProcessor(),
  [JOBS.SEND_EMAIL_FLOW.name]: new FlowSendEmailProcessor(),
  [JOBS.SEND_PUSH.name]: new SendPushProcessor(),
  [JOBS.LOG_DELIVERY.name]: undefined as unknown as ProcessorInstance, // handled by parent aggregation
};

export function registerProcessor(name: string, processor: ProcessorInstance) {
  if (processorRegistry[name]) {
    throw new Error(`Processor already registered for job: ${name}`);
  }
  processorRegistry[name] = processor;
}

export function getProcessor(name: string): ProcessorInstance | undefined {
  return processorRegistry[name];
}
