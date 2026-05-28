import { JobsOptions, FlowJob } from "bullmq";

export interface FlowStep<T = any> {
  name: string;
  queueName: string;
  data?: T;
  opts?: JobsOptions;
  children?: FlowStep[];
}

export interface WorkflowDefinition<T = any> {
  name: string;
  queueName: string;
  data?: T;
  steps: FlowStep[];
}

export interface WorkflowResult {
  flowId: string;
  parentJobId: string;
  jobs: FlowJob[];
}

export interface FlowStepStatus {
  jobId: string;
  name: string;
  status: "waiting-children" | "waiting" | "active" | "completed" | "failed";
  result?: unknown;
  failedReason?: string;
  processedOn?: string;
  finishedOn?: string;
  durationMs?: number;
}

export interface FlowStatus {
  flowId: string;
  parentJobId: string;
  steps: FlowStepStatus[];
  isCompleted: boolean;
  isFailed: boolean;
}
