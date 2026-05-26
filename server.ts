import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Queue } from "bullmq";
import { workbench } from "./packages/workbench/src/adapters/hono";
import { serveStatic } from "@hono/node-server/serve-static";

const REDIS_CONFIG = { host: "localhost", port: 6380 };
const queues = {
  email: new Queue("email-queue", { connection: REDIS_CONFIG }),
  documents: new Queue("doc-queue", { connection: REDIS_CONFIG }),
  metrics: new Queue("metrics-queue", { connection: REDIS_CONFIG }),
};

const app = new Hono();

// Health Checks (Infra)
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/health/ready", (c) => c.json({ status: "ready" }));

// Workbench
app.use("/admin/assets/*", serveStatic({
  root: "./packages/workbench/dist/ui",
  rewriteRequestPath: (path) => path.replace(/^\/admin/, ""),
}));
app.route("/admin", workbench({
  queues: Object.values(queues),
  title: "Boilerplate Workbench",
}));

const server = serve({ fetch: app.fetch, port: 3000 });
console.log("Servidor rodando em http://localhost:3000");

// Graceful Shutdown
const shutdown = async () => {
  console.log("Desligando servidor...");
  server.close();
  await Promise.all(Object.values(queues).map(q => q.close()));
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
