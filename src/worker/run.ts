import { Worker } from "bullmq";
import { processorRegistry } from "../registry";

const REDIS_CONFIG = { host: "localhost", port: 6380 };

const workerConfigs = [
  { name: "email-queue", concurrency: 5 },
  { name: "doc-queue", concurrency: 1 },
  { name: "metrics-queue", concurrency: 10 },
];

const workers = workerConfigs.map((config) => {
  const worker = new Worker(
    config.name,
    async (job) => {
      const processor = processorRegistry[job.name];
      if (!processor) throw new Error(`Processador ausente: ${job.name}`);
      // Agora usamos o método com validação Zod
      return processor.validateAndHandle(job);
    },
    { connection: REDIS_CONFIG, concurrency: config.concurrency }
  );

  worker.on("failed", (job, err) => console.error(`[Fatal] Job ${job?.id} falhou:`, err));
  return worker;
});

// Tratamento de erros globais
process.on("unhandledRejection", (err) => console.error("Unhandled Rejection:", err));
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));

// Graceful Shutdown dos workers
const shutdown = async () => {
  console.log("Worker fechando conexões...");
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
