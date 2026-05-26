import { Queue } from "bullmq";

const REDIS_CONFIG = { host: "localhost", port: 6380 };

const queues = {
  email: new Queue("email-queue", { connection: REDIS_CONFIG }),
  documents: new Queue("doc-queue", { connection: REDIS_CONFIG }),
  metrics: new Queue("metrics-queue", { connection: REDIS_CONFIG }),
};

export const jobDisposer = {
  sendEmail: (data: { to: string; subject: string }) => 
    queues.email.add("send-email", data),
    
  processPdf: (data: { documentId: string }) => 
    queues.documents.add("process-pdf", data),
    
  syncMetrics: (data: { value: number }) => 
    queues.metrics.add("sync-metrics", data),
};
