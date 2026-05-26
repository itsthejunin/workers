import { HTTPException } from 'hono/http-exception';
import logger from '../utils/logger';

// Error handling middleware
export function errorHandler() {
  return async (c, next) => {
    try {
      await next();
    } catch (err) {
      // Log the error
      logger.error({
        err: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
        url: c.req.path,
        method: c.req.method,
      });

      // If it's already an HTTPException, let Hono handle it
      if (err instanceof HTTPException) {
        throw err;
      }

      // Otherwise, return a generic error
      return c.json(
        { 
          error: 'Internal Server Error', 
          message: process.env.NODE_ENV === 'development' 
            ? (err instanceof Error ? err.message : String(err)) 
            : undefined 
        },
        500
      );
    }
  };
}