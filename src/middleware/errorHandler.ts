import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AppError } from '../utils/AppError';
import { env } from '../config';
import logger from '../utils/logger';

export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof AppError) {
        logger.warn(
          {
            code: err.code,
            message: err.message,
            details: err.details,
            retryable: err.retryable,
            url: c.req.path,
            method: c.req.method,
          },
          `AppError: ${err.code}`
        );

        return c.json(err.toJSON(), err.statusCode as any);
      }

      if (err instanceof HTTPException) {
        throw err;
      }

      logger.error(
        {
          err: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined,
          url: c.req.path,
          method: c.req.method,
        },
        'Unhandled error'
      );

      return c.json(
        {
          error: 'INTERNAL_ERROR',
          message: env.NODE_ENV === 'development'
            ? (err instanceof Error ? err.message : String(err))
            : 'Internal Server Error',
          statusCode: 500,
          retryable: false,
        } as const,
        500
      );
    }
  };
}
