import pino from 'pino';
import os from 'os';
import { env } from '../config/index.ts';

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
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    pid: process.pid,
    hostname: os.hostname(),
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token'],
    censor: '[REDACTED]',
  },
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

export default logger;
