import type { Context, Next } from 'hono';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { env } from '../config';
import { getRedisConnection } from '../utils/redis-connection';

const rateLimiterRedis = getRedisConnection();

export const rateLimiter = new RateLimiterRedis({
  storeClient: rateLimiterRedis,
  keyPrefix: 'rate_limit',
  points: env.RATE_LIMIT_POINTS,
  duration: env.RATE_LIMIT_DURATION,
});

export function rateLimiterMiddleware(skipPaths: string[] = []) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    if (skipPaths.some(prefix => path.startsWith(prefix))) {
      return next();
    }

    const ip = c.req.header('x-forwarded-for') ||
               c.req.header('x-real-ip') ||
               'unknown';

    try {
      await rateLimiter.consume(ip);
      await next();
    } catch (err) {
      const msBeforeNext = (err as { msBeforeNext?: number })?.msBeforeNext ?? 900000;
      return c.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded' },
        429,
        { 'Retry-After': Math.floor(msBeforeNext / 1000).toString() }
      );
    }
  };
}
