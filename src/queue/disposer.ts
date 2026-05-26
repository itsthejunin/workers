import { Queue } from "bullmq";
import { JOBS } from "@boilerplate/shared/jobs";

const REDIS_CONFIG = { host: "localhost", port: 6380 };

const queues = {
  email: new Queue("email-queue", { connection: REDIS_CONFIG }),
  documents: new Queue("doc-queue", { connection: REDIS_CONFIG }),
  metrics: new Queue("metrics-queue", { connection: REDIS_CONFIG }),
};

export const jobDisposer = {
  sendEmail: (data: typeof JOBS.EMAIL.schema._type, jobId?: string) => 
    queues.email.add(JOBS.EMAIL.name, data, { jobId }),
    
  processPdf: (data: typeof JOBS.PDF.schema._type, jobId?: string) => 
    queues.documents.add(JOBS.PDF.name, data, { jobId }),
    
  syncMetrics: (data: typeof JOBS.METRICS.schema._type, jobId?: string) => 
    queues.metrics.add(JOBS.METRICS.name, data, { jobId }),
};
