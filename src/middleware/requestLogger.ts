import type { Context, Next } from 'hono';
import logger from '../utils/logger';

export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);

    c.header('X-Request-ID', requestId);

    const childLogger = logger.child({ requestId, method: c.req.method, path: c.req.path });

    childLogger.info('Request started');

    try {
      await next();
    } finally {
      const ms = Date.now() - start;
      const statusCode = c.res.status ?? 500;

      childLogger.info(
        {
          status: statusCode,
          responseTime: `${ms}ms`,
          durationMs: ms,
        },
        'Request completed'
      );
    }
  };
}
