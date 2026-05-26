import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { env } from '../config';

// Create a Redis client for rate limiting (separate from BullMQ to avoid interference)
const rateLimiterRedis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  // Enable auto-resilience to handle Redis restarts
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

// Configure rate limiter: 100 requests per 15 minutes by default
// Adjust based on your needs
export const rateLimiter = new RateLimiterRedis({
  storeClient: rateLimiterRedis,
  keyPrefix: 'rate_limit',
  points: 100, // 100 points
  duration: 900, // per 900 seconds (15 minutes)
});

// Middleware function
// skipPaths: array of path prefixes to skip rate limiting (e.g., ['/health', '/admin/assets'])
export function rateLimiterMiddleware(skipPaths: string[] = []) {
  return async (c, next) => {
    const path = c.req.path;
    
    // Skip rate limiting for specified paths
    if (skipPaths.some(prefix => path.startsWith(prefix))) {
      return next();
    }

    // Use IP address as the key (could also use user ID for authenticated routes)
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               c.req.remote ||
               'unknown';

    try {
      await rateLimiter.consume(ip);
      await next();
    } catch (err) {
      // Rate limit exceeded
      return c.json(
        { 
          error: 'Too Many Requests', 
          message: 'Rate limit exceeded' 
        },
        429,
        { 
          'Retry-After': Math.floor((err as any).msBeforeNext / 1000) || '900' 
        }
      );
    }
  };
}