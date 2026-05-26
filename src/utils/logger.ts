import pino from 'pino';
import { env } from '../config/index.ts';

// Define custom levels if needed, but pino has standard ones
const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
  // Add timestamp and hostname
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    pid: process.pid,
    hostname: require('os').hostname(),
  },
});

// Create a child logger with request ID for HTTP requests
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

export default logger;