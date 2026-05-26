import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { workbench } from "./packages/workbench/src/adapters/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import logger from "./src/utils/logger.ts";
import { env } from "./src/config/index.ts";
import { errorHandler } from "./src/middleware/errorHandler.ts";
import { requestLogger } from "./src/middleware/requestLogger.ts";
import { securityHeaders } from "./src/middleware/securityHeaders.ts";
import { rateLimiterMiddleware } from "./src/middleware/rateLimiter.ts";
import { performHealthCheck } from "./src/health/checker.ts";
import { initAllQueues } from "./src/queue/init.ts";

// Initialize all queues
const queues = initAllQueues();

const app = new Hono();

// Middleware
app.use('*', requestLogger());
app.use('*', errorHandler());
app.use('*', securityHeaders());
// Apply rate limiting, but skip health checks and static assets
app.use('*', rateLimiterMiddleware(['/health', '/health/ready', '/admin/assets']));

// Health Checks
app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/health/ready", async (c) => {
  try {
    const health = await performHealthCheck(
      { host: env.REDIS_HOST, port: env.REDIS_PORT },
      queues
    );

    // Check if Redis is ok and all queues are ok
    const redisOk = health.redis.status === 'ok';
    const queuesOk = Object.values(health.queues).every(q => q.status === 'ok');

    if (redisOk && queuesOk) {
      return c.json({ status: "ready" });
    } else {
      // If not ready, we return 503 and the health details for debugging
      return c.json({ status: "not ready", ...health }, 503);
    }
  } catch (err) {
    logger.error('Health check failed', { err: err instanceof Error ? err.message : err });
    return c.json({ status: "error", message: "Health check failed" }, 500);
  }
});

// Workbench
app.use("/admin/assets/*", serveStatic({
  root: "./packages/workbench/dist/ui",
  rewriteRequestPath: (path) => path.replace(/^\/admin/, ""),
}));
app.route("/admin", workbench({
  queues: Object.values(queues),
  title: "Boilerplate Workbench",
}));

const server = serve({ fetch: app.fetch, port: env.PORT });
logger.info(`Servidor rodando em http://localhost:${env.PORT}`);

// Graceful Shutdown
const shutdown = async () => {
  logger.info("Desligando servidor...");
  server.close();
  await Promise.all(Object.values(queues).map(q => q.close()));
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);