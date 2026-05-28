import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { workbench } from "./packages/workbench/src/adapters/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import logger from "./src/utils/logger.ts";
import { env } from "./src/config/index.ts";
import { featureFlags } from "./src/config/featureFlags.ts";
import { errorHandler } from "./src/middleware/errorHandler.ts";
import { requestLogger } from "./src/middleware/requestLogger.ts";
import { securityHeaders } from "./src/middleware/securityHeaders.ts";
import { rateLimiterMiddleware } from "./src/middleware/rateLimiter.ts";
import { performHealthCheck } from "./src/health/checker.ts";
import { initAllQueues } from "./src/queue/init.ts";
import { setupCronJobs } from "./src/queue/cron.ts";
import { closeRedisConnection } from "./src/utils/redis-connection.ts";
import { collectSystemMetrics, formatPrometheusMetrics } from "./src/metrics/index.ts";
import { flowManager } from "./src/workflow/manager.ts";
import { createAiContentFlow } from "./src/workflow/examples/ai-content.ts";
import { createDataPipelineFlow } from "./src/workflow/examples/data-pipeline.ts";
import { createNotificationFlow } from "./src/workflow/examples/notification.ts";

const queues = initAllQueues();

setupCronJobs(queues);

const app = new Hono();

app.use('*', requestLogger());
app.use('*', errorHandler());
app.use('/admin*', securityHeaders());
app.use('*', rateLimiterMiddleware(['/health', '/admin/assets']));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/health/ready", async (c) => {
  try {
    const health = await performHealthCheck(
      { host: env.REDIS_HOST, port: env.REDIS_PORT },
      queues
    );

    const redisOk = health.redis.status === 'ok';
    const queuesOk = Object.values(health.queues).every(q => q.status === 'ok');

    if (redisOk && queuesOk) {
      return c.json({ status: "ready" });
    }

    return c.json({ status: "not ready", ...health }, 503);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, 'Health check failed');
    return c.json({ status: "error", message: "Health check failed" }, 500);
  }
});

app.get("/health/detailed", async (c) => {
  try {
    const health = await performHealthCheck(
      { host: env.REDIS_HOST, port: env.REDIS_PORT },
      queues
    );
    return c.json(health);
  } catch (err) {
    return c.json({ status: "error", message: "Health check failed" }, 500);
  }
});

if (featureFlags.enableMetricsEndpoint) {
  app.get("/metrics", async (c) => {
    try {
      const metrics = await collectSystemMetrics(queues);
      return c.text(formatPrometheusMetrics(metrics), 200, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    } catch (err) {
      logger.error({ err: String(err) }, 'Failed to collect metrics');
      return c.json({ error: 'Failed to collect metrics' }, 500);
    }
  });

  app.get("/api/metrics", async (c) => {
    try {
      const metrics = await collectSystemMetrics(queues);
      return c.json(metrics);
    } catch (err) {
      return c.json({ error: 'Failed to collect metrics' }, 500);
    }
  });
}

// --- Flow / Workflow Endpoints ---
app.post("/api/flows/ai-content", async (c) => {
  const body = await c.req.json();
  const { topic, tone, maxWords } = body;
  if (!topic) return c.json({ error: "topic is required" }, 400);

  const flow = createAiContentFlow(topic, tone, maxWords);
  const result = await flowManager.create(flow);
  return c.json(result, 201);
});

app.post("/api/flows/data-pipeline", async (c) => {
  const body = await c.req.json();
  const { source, table, mode } = body;
  if (!source || !table) return c.json({ error: "source and table are required" }, 400);

  const flow = createDataPipelineFlow(source, table, mode);
  const result = await flowManager.create(flow);
  return c.json(result, 201);
});

app.post("/api/flows/notification", async (c) => {
  const body = await c.req.json();
  const { userId, type, title, body: msgBody } = body;
  if (!userId || !title || !msgBody) return c.json({ error: "userId, title, and body are required" }, 400);

  const flow = createNotificationFlow(userId, type ?? "both", title, msgBody);
  const result = await flowManager.create(flow);
  return c.json(result, 201);
});

app.get("/api/flows/:queueName/:parentJobId", async (c) => {
  const { queueName, parentJobId } = c.req.param();
  const status = await flowManager.getFlowStatus(queueName, parentJobId);
  if (!status) return c.json({ error: "Flow not found" }, 404);
  return c.json(status);
});

app.route("/admin", workbench({
  queues: Object.values(queues),
  title: "Boilerplate Workbench",
}));

const server = serve({ fetch: app.fetch, port: env.PORT });
logger.info(`Servidor rodando em http://localhost:${env.PORT}`);

const shutdown = async () => {
  logger.info("Desligando servidor...");
  server.close();
  await Promise.all(Object.values(queues).map(q => q.close()));
  await closeRedisConnection();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
