export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'JOB_FAILED'
  | 'JOB_TIMEOUT'
  | 'DEPENDENCY_UNAVAILABLE';

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  cause?: Error;
  retryable?: boolean;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(ctx: ErrorContext) {
    super(ctx.message);
    this.name = 'AppError';
    this.code = ctx.code;
    this.statusCode = ctx.statusCode ?? 500;
    this.details = ctx.details;
    this.retryable = ctx.retryable ?? false;
    if (ctx.cause) {
      this.cause = ctx.cause;
    }
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({
      code: 'VALIDATION_ERROR',
      message,
      statusCode: 400,
      details,
    });
  }

  static notFound(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      message,
      statusCode: 404,
      details,
    });
  }

  static externalService(service: string, cause?: Error): AppError {
    return new AppError({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: `External service error: ${service}`,
      statusCode: 502,
      details: { service },
      cause,
      retryable: true,
    });
  }

  static jobFailed(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({
      code: 'JOB_FAILED',
      message,
      statusCode: 500,
      details,
      retryable: true,
    });
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
    };
  }
}
