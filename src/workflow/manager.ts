import { FlowProducer, type FlowJob } from "bullmq";
import { getRedisConnection } from "../utils/redis-connection";
import logger from "../utils/logger";
import type { FlowStep, WorkflowDefinition, WorkflowResult, FlowStatus, FlowStepStatus } from "./types";

function toFlowJob(step: FlowStep): FlowJob {
  return {
    name: step.name,
    queueName: step.queueName,
    data: step.data,
    opts: step.opts,
    children: step.children?.map((c) => toFlowJob(c)),
  };
}

function collectAllJobs(node: { job: { id?: string }; children?: any[] }): any[] {
  const jobs = [node.job];
  if (node.children) {
    for (const child of node.children) {
      jobs.push(...collectAllJobs(child));
    }
  }
  return jobs;
}

export class FlowManager {
  private producer: FlowProducer;

  constructor() {
    const connection = getRedisConnection();
    this.producer = new FlowProducer({ connection: connection as any });
  }

  async create(def: WorkflowDefinition): Promise<WorkflowResult> {
    const flowId = `${def.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    logger.info({ flowId, name: def.name, stepCount: def.steps.length }, "Flow started");

    const flow = await this.producer.add({
      name: def.name,
      queueName: def.queueName,
      data: { ...def.data, flowId },
      children: def.steps.map((s) => toFlowJob(s)),
    });

    const parentJobId = flow.job.id!;

    logger.info({ flowId, parentJobId, name: def.name }, "Flow created successfully");

    return {
      flowId,
      parentJobId,
      jobs: collectAllJobs(flow),
    };
  }

  async createChain(queueName: string, steps: FlowStep[]): Promise<WorkflowResult> {
    if (steps.length === 0) {
      throw new Error("Cannot create a chain with zero steps");
    }

    const flowId = `chain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    let current: FlowJob | null = null;

    // Build chain: first step is leaf (executes first), last step is root (executes last)
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      current = {
        name: step.name,
        queueName: step.queueName,
        data: { ...step.data, flowId, chainIndex: i },
        opts: step.opts,
        children: current ? [current] : undefined,
      };
    }

    const flow = await this.producer.add(current!);

    logger.info(
      { flowId, parentJobId: flow.job.id, steps: steps.map((s) => s.name) },
      "Chain created"
    );

    return {
      flowId,
      parentJobId: flow.job.id!,
      jobs: collectAllJobs(flow),
    };
  }

  async getFlowStatus(queueName: string, parentJobId: string): Promise<FlowStatus | null> {
    const { Queue } = await import("bullmq");
    const queue = new Queue(queueName, { connection: getRedisConnection() as any });

    try {
      const job = await queue.getJob(parentJobId);
      if (!job) return null;

      const parentState = await job.getState();
      const childrenValues = (await job.getChildrenValues()) ?? {};

      const stepStatuses: FlowStepStatus[] = [];

      stepStatuses.push({
        jobId: parentJobId,
        name: job.name,
        status: parentState as FlowStepStatus["status"],
        result: job.returnvalue ?? undefined,
        failedReason: job.failedReason ?? undefined,
        processedOn: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : undefined,
        finishedOn: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : undefined,
        durationMs:
          job.finishedOn && job.processedOn
            ? job.finishedOn - job.processedOn
            : undefined,
      });

      const depCount = await job.getDependenciesCount();

      if (depCount.processed && depCount.processed > 0) {
        let cursor = 0;
        let hasMore = true;
        while (hasMore) {
          const result: any = await job.getDependencies({
            processed: { count: 100, cursor },
          });
          const depJobs: any[] = result.processed ?? [];
          for (const depJob of depJobs) {
            stepStatuses.push({
              jobId: depJob.id!,
              name: depJob.name,
              status: "completed",
              result: (childrenValues as Record<string, unknown>)[depJob.id!] ?? undefined,
              processedOn: depJob.processedOn
                ? new Date(depJob.processedOn).toISOString()
                : undefined,
              finishedOn: depJob.finishedOn
                ? new Date(depJob.finishedOn).toISOString()
                : undefined,
              durationMs:
                depJob.finishedOn && depJob.processedOn
                  ? (depJob.finishedOn as number) - (depJob.processedOn as number)
                  : undefined,
            });
          }
          if (result.nextProcessedCursor === 0) hasMore = false;
          cursor = result.nextProcessedCursor;
        }
      }

      if (depCount.failed && depCount.failed > 0) {
        const result: any = await job.getDependencies({
          failed: { count: 100, cursor: 0 },
        });
        for (const depJob of result.failed ?? []) {
          stepStatuses.push({
            jobId: depJob.id!,
            name: depJob.name,
            status: "failed",
            failedReason: depJob.failedReason ?? undefined,
          });
        }
      }

      return {
        flowId: job.data?.flowId ?? parentJobId,
        parentJobId,
        steps: stepStatuses,
        isCompleted: parentState === "completed",
        isFailed: parentState === "failed",
      };
    } finally {
      await queue.close();
    }
  }
}

export const flowManager = new FlowManager();
