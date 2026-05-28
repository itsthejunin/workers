import { z } from "zod";
import { JOBS } from "@boilerplate/shared/jobs";
import { initAllQueues, getQueueConfigs } from "./init";

const queues = initAllQueues();
const queueConfigs = getQueueConfigs();

function getDedupOptions(queueName: string, jobId?: string): { deduplication?: { id: string; ttl: number } } {
  const config = queueConfigs[queueName];
  if (!config?.dedupTtlMs) return {};

  const dedupId = jobId ?? `${queueName}:${Date.now()}`;
  return {
    deduplication: {
      id: dedupId,
      ttl: config.dedupTtlMs,
    },
  };
}

export const jobDisposer = {
  sendEmail: (data: z.infer<typeof JOBS.EMAIL.schema>, jobId?: string) =>
    queues["email-queue"].add(JOBS.EMAIL.name, data, {
      jobId,
      ...getDedupOptions("email-queue", jobId),
    }),

  processPdf: (data: z.infer<typeof JOBS.PDF.schema>, jobId?: string) =>
    queues["doc-queue"].add(JOBS.PDF.name, data, {
      jobId,
      ...getDedupOptions("doc-queue", jobId),
    }),

  syncMetrics: (data: z.infer<typeof JOBS.METRICS.schema>, jobId?: string) =>
    queues["metrics-queue"].add(JOBS.METRICS.name, data, {
      jobId,
      ...getDedupOptions("metrics-queue", jobId),
    }),

  addToQueue: (queueName: string, jobName: string, data: unknown, jobId?: string) => {
    const queue = queues[queueName];
    if (!queue) throw new Error(`Queue not found: ${queueName}`);
    return queue.add(jobName, data, {
      jobId,
      ...getDedupOptions(queueName, jobId),
    });
  },

  // Flow / Workflow
  startFlow: (def: import("../workflow/types").WorkflowDefinition) =>
    import("../workflow/manager").then((m) => m.flowManager.create(def)),

  startChain: (queueName: string, steps: import("../workflow/types").FlowStep[]) =>
    import("../workflow/manager").then((m) => m.flowManager.createChain(queueName, steps)),

  getFlowStatus: (queueName: string, parentJobId: string) =>
    import("../workflow/manager").then((m) => m.flowManager.getFlowStatus(queueName, parentJobId)),
};
