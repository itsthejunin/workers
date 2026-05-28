enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeoutMs?: number;
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;
  public readonly name: string;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.successThreshold = opts.successThreshold ?? 2;
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.name = opts.name ?? 'unnamed';
  }

  get isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  get isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  get isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  getState(): string {
    return CircuitState[this.state];
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.timeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else if (fallback) {
        return fallback();
      } else {
        throw new Error(`Circuit breaker "${this.name}" is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }
}
