import logger from '../utils/logger';

export function requestLogger() {
  return async (c, next) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      const ms = Date.now() - start;
      const statusCode = c.res.status ?? 500; // fallback to 500 if not set

      logger.info({
        method: c.req.method,
        url: c.req.path,
        status: statusCode,
        responseTime: `${ms}ms`,
        // We can add request id if we have one, but for now we don't
      });
    }
  };
}