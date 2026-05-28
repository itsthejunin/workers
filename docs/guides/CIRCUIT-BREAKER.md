# Circuit Breaker Guide

This guide explains how to use the circuit breaker pattern in the boilerplate for protecting against failing external service calls.

## Overview

The circuit breaker pattern prevents applications from repeatedly trying to execute an operation that's likely to fail. It allows an application to gracefully handle service failures and recover when the service becomes available again.

Inspired by electrical circuit breakers, this pattern wraps potentially failing operations and monitors for failures. Once failures reach a threshold, the circuit breaker "trips" and prevents further attempts for a cooldown period, after which it allows a limited number of test requests to determine if the service has recovered.

## How It Works

### States
The circuit breaker has three states:

1. **CLOSED** (Normal Operation)
   - Requests pass through to the protected function
   - Failures are counted
   - When failures reach the threshold, the breaker trips to OPEN

2. **OPEN** (Failing)
   - Requests fail immediately without calling the protected function
   - After a timeout period, the breaker moves to HALF_OPEN

3. **HALF_OPEN** (Testing Recovery)
   - A limited number of requests are allowed to pass through
   - If successful, the breaker returns to CLOSED
   - If any fail, the breaker returns to OPEN

### Typical Usage Pattern
```
┌─────────┐    Success/Failure Count    ┌─────────┐
│ CLOSED  ◄─────────────────────────────┤ OPEN    │
└─────────┘                             ┌───────┐ │
     │                                     │       │ │
     │ Timeout                             │       │ │
     ▼                                     ▼       │ │
┌─────────┐    Success/Failure Count    ┌─────────┐ │ │
│HALF_OPEN┼─────────────────────────────┤ OPEN    │ │ │
└─────────┘                             └───────┘ │ │
     │                                                     │
     │ Success (HALF_OPEN)                                 │
     ▼                                                     │
┌─────────┐                                               │ │
│ CLOSED  ◄───────────────────────────────────────────────┘ │
└─────────┘                                               │ │
     │                                                     │
     │ Failure (HALF_OPEN)                                 │
     └─────────────────────────────────────────────────────┘
```

## Implementation

The boilerplate provides a `CircuitBreaker` class in `src/utils/circuit-breaker.ts`.

### Basic Usage
```typescript
import { CircuitBreaker } from "./src/utils/circuit-breaker";

// Create a circuit breaker for an external service
const apiBreaker = new CircuitBreaker({
  name: "external-api",        // Identifier for logging/metrics
  failureThreshold: 5,         // Trip after 5 consecutive failures
  successThreshold: 3,         // Require 3 successes to close from HALF_OPEN
  timeoutMs: 60000             // Wait 60 seconds before trying HALF_OPEN
});

// Use the circuit breaker to protect a function call
async function fetchUserData(userId: string) {
  return await apiBreaker.call(
    // Protected function
    () => externalApi.getUser(userId),
    // Optional fallback function
    () => getCachedUserData(userId)
  );
}
```

### Advanced Usage with Fallback
```typescript
async function processPayment(paymentData: PaymentData) {
  return await paymentBreaker.call(
    // Main payment processing
    () => paymentGateway.charge(paymentData.amount, paymentData.card),
    // Fallback to queued processing when gateway is down
    () => {
      // Queue the payment for later processing
      return queuePaymentForLater(paymentData);
    }
  );
}
```

### Manual Control
```typescript
// Manually trip the circuit breaker
breaker.forceOpen();

// Manually reset to closed state
breaker.forceClose();

// Check current state
if (breaker.isOpen) {
  // Show degraded functionality to user
} else if (breaker.isClosed) {
  // Normal operation
} else if (breaker.isHalfOpen) {
  // Show warning about testing recovery
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | "unnamed" | Identifier for logging and metrics |
| `failureThreshold` | number | 5 | Number of failures before tripping to OPEN |
| `successThreshold` | number | 3 | Number of successes in HALF_OPEN needed to close |
| `timeoutMs` | number | 60000 | Milliseconds to wait before attempting HALF_OPEN |
| `volumeThreshold` | number | 20 | Minimum number of calls before failure percentage is considered (not implemented in current version) |

## Integration with Existing Systems

### In Job Processors
Use circuit breakers in processors that call external services:

```typescript
import { BaseProcessor } from "@boilerplate/processor/base";
import { CircuitBreaker } from "../../utils/circuit-breaker";
import { AppError } from "../../utils/AppError";
import { z } from "zod";

const weatherApiBreaker = new CircuitBreaker({
  name: "weather-api",
  failureThreshold: 3,
  timeoutMs: 30000
});

export class WeatherProcessor extends BaseProcessor<WeatherData, WeatherResult> {
  schema = z.object({
    location: z.string(),
    date: z.string().date()
  });

  async handle(job: any): Promise<WeatherResult> {
    const data = job.data as WeatherData;
    
    try {
      const weatherData = await weatherApiBreaker.call(
        () => weatherApi.getForecast(data.location, data.date),
        () => ({ 
          temperature: 20, 
          condition: "unknown", 
          source: "fallback" 
        }) // Fallback to cached/default data
      );
      
      return {
        location: data.location,
        forecast: weatherData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Convert to structured error for better handling
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.externalService("Weather API", error);
    }
  }
}
```

### With Retry Logic
Combine circuit breakers with retry logic for transient failures:

```typescript
import { CircuitBreaker } from "../../utils/circuit-breaker";

const apiBreaker = new CircuitBreaker({
  name: "external-api",
  failureThreshold: 3,
  timeoutMs: 30000
});

async function resilientApiCall(): Promise<ApiResponse> {
  return await apiBreaker.call(
    async () => {
      // Retry logic for transient failures
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await externalApi.call();
        } catch (error) {
          lastError = error;
          // Don't retry on certain error types
          if (!isTransientError(error)) {
            throw error;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          );
        }
      }
      
      throw lastError ?? new Error("Unknown error");
    },
    // Fallback when circuit is open or all retries failed
    () => getCachedData()
  );
}
```

## Monitoring and Metrics

The circuit breaker logs state changes and can be extended to emit metrics:

### Logging
```
INFO  CircuitBreaker: External API breaker transitioned to OPEN state after 5 failures
INFO  CircuitBreaker: External API breaker transitioned to HALF_OPEN state after 60s timeout
INFO  CircuitBreaker: External API breaker transitioned to CLOSED state after 3 successes in HALF_OPEN
```

### Custom Metrics Integration
You can extend the circuit breaker to emit Prometheus metrics:
```typescript
// In your metrics collection
const breakerStates = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Current state of circuit breaker (0=closed, 1=open, 2=half-open)',
  labelNames: ['name']
});

// Update periodically
setInterval(() => {
  breakerStates.set({ name: 'external-api' }, breaker.isOpen ? 1 : 
                   breaker.isHalfOpen ? 2 : 0);
}, 5000);
```

## Best Practices

### 1. Choose Appropriate Thresholds
- **failureThreshold**: Low enough to catch problems early, high enough to avoid false positives
  - Start with 3-5 for most services
- **successThreshold**: Usually 2-3 successes to confirm recovery
- **timeoutMs**: Long enough for transient issues to resolve, short enough to fail fast
  - Start with 30-60 seconds for web APIs

### 2. Use Meaningful Names
Choose names that help identify which service is protected:
```typescript
// Good
const paymentBreaker = new CircuitBreaker({ name: "payment-gateway" });
const weatherBreaker = new CircuitBreaker({ name: "weather-api" });

// Less clear
const breaker1 = new CircuitBreaker({ name: "breaker1" });
const breaker2 = new CircuitBreaker({ name: "breaker2" });
```

### 3. Provide Meaningful Fallbacks
When possible, provide useful fallback data:
- Cached data from successful previous calls
- Default values that allow degraded functionality
- Queued requests for later processing when service recovers

### 4. Monitor State Transitions
Track circuit breaker state changes to detect service issues:
- Frequent trips to OPEN indicate persistent problems
- Long periods in OPEN suggest service downtime
- Rapid cycling may indicate flaky service

### 5. Consider Call Volume
For low-volume services, the breaker might trip too easily:
- Consider adjusting thresholds based on expected traffic
- For very low volume, you might want to disable the breaker

### 6. Test Failure Scenarios
Test your circuit breaker configuration:
- Simulate service failures to verify tripping
- Test recovery when service returns
- Verify fallback behavior works as expected

## Common Use Cases

### 1. External API Protection
```typescript
// Protect calls to third-party APIs
const apiBreaker = new CircuitBreaker({
  name: "third-party-api",
  failureThreshold: 3,
  timeoutMs: 60000
});

async function fetchExternalData(request: ApiRequest) {
  return await apiBreaker.call(
    () => thirdPartyApi.fetchData(request),
    () => getCachedResponse(request)
  );
}
```

### 2. Database Connection Protection
```typescript
// Protect database connections during high load or maintenance
const dbBreaker = new CircuitBreaker({
  name: "primary-db",
  failureThreshold: 5,
  timeoutMs: 120000 // 2 minutes for DB recovery
});

async function getUserData(userId: string) {
  return await dbBreaker.call(
    () => db.query("SELECT * FROM users WHERE id = ?", [userId]),
    () => getUserFromCache(userId)
  );
}
```

### 3. Message Queue Protection
```typescript
// Protect against message broker issues
const mqBreaker = new CircuitBreaker({
  name: "message-queue",
  failureThreshold: 3,
  timeoutMs: 30000
});

async function sendNotification(notification: Notification) {
  return await mqBreaker.call(
    () => messageQueue.publish("notifications", notification),
    () => {
      // Fallback to direct email/SMS for critical notifications
      return sendDirectNotification(notification);
    }
  );
}
```

### 4. File System/Network Protection
```typescript
// Protect against network file system issues
const fsBreaker = new CircuitBreaker({
  name: "nfs-storage",
  failureThreshold: 3,
  timeoutMs: 60000
});

async function processFile(filePath: string) {
  return await fsBreaker.call(
    () => fsProcessor.process(filePath),
    () => {
      // Fallback to local processing or queuing
      return queueFileForLaterProcessing(filePath);
    }
  );
}
```

## Integration with Workflows

Circuit breakers work well within workflow steps:

```typescript
export class ApiFetchProcessor extends BaseProcessor<ApiRequestData, ApiData> {
  schema = z.object({ endpoint: z.string(), params: z.object() });
  
  // Create breaker instance per processor (or share if same service)
  private apiBreaker = new CircuitBreaker({
    name: "external-api",
    failureThreshold: 3,
    timeoutMs: 30000
  });

  async handle(job: any): Promise<ApiData> {
    const data = job.data as ApiRequestData;
    
    return await this.apiBreaker.call(
      // Main API call
      () => externalApi.fetch(data.endpoint, data.params),
      // Fallback to cached or default data
      () => getDefaultApiData(data.endpoint)
    );
  }
}
```

## Testing Circuit Breakers

Test different states and transitions:

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { CircuitBreaker } from "../../src/utils/circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;
  
  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: "test-breaker",
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 50
    });
  });
  
  it("should start in CLOSED state", () => {
    expect(breaker.isClosed).toBe(true);
    expect(breaker.isOpen).toBe(false);
    expect(breaker.isHalfOpen).toBe(false);
  });
  
  it("should trip to OPEN after failure threshold", async () => {
    const failingFn = async () => { throw new Error("Simulated failure"); };
    
    // First 2 calls should attempt the function
    await expect(breaker.call(failingFn)).rejects.toThrow();
    await expect(breaker.call(failingFn)).rejects.toThrow();
    expect(breaker.isClosed).toBe(true); // Still closed
    
    // Third call should trip to OPEN
    await expect(breaker.call(failingFn)).rejects.toThrow();
    expect(breaker.isOpen).toBe(true);
    expect(breaker.isHalfOpen).toBe(false);
    
    // Subsequent calls should fail immediately without calling function
    await expect(breaker.call(failingFn)).rejects.toThrow();
  });
  
  it("should transition to HALF_OPEN after timeout", async () => {
    // Trip to open
    const failingFn = async () => { throw new Error("Failure"); };
    await breaker.call(failingFn).catch(() => {}); // 1
    await breaker.call(failingFn).catch(() => {}); // 2
    await breaker.call(failingFn).catch(() => {}); // 3 - trips to open
    
    expect(breaker.isOpen).toBe(true);
    
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Next attempt should allow one call through (HALF_OPEN)
    const succeedingFn = async () => { return "success"; };
    const result = await breaker.call(succeedingFn);
    expect(result).toBe("success");
    expect(breaker.isHalfOpen).toBe(true);
    
    // Another success should close the breaker
    await breaker.call(succeedingFn);
    expect(breaker.isClosed).toBe(true);
  });
});
```

## Error Handling

The `call` method will:
- Throw the original error from the protected function when it fails and the breaker is CLOSED or HALF_OPEN
- Throw a `CircuitBreakerOpenError` when the breaker is OPEN and no fallback is provided
- Return the fallback result when the breaker is OPEN and a fallback is provided
- Propagate any errors from the fallback function

### Custom Error Types
You can create specific error types for circuit breaker events:
```typescript
class CircuitBreakerOpenError extends AppError {
  constructor(service: string) {
    super({
      code: 'CIRCUIT_BREAKER_OPEN',
      message: `Circuit breaker is open for service: ${service}`,
      statusCode: 503, // Service Unavailable
      retryable: true,
      details: { service }
    });
  }
}
```

Then modify the CircuitBreaker class to throw this specific error when open and no fallback.

## Limitations and Considerations

### 1. Not a Substitute for Proper Error Handling
Circuit breakers work best when combined with:
- Proper timeout settings on network calls
- Retry logic with exponential backoff for transient errors
- Application-level error handling and fallback strategies

### 2. State is Instance-Based
Each `CircuitBreaker` instance maintains its own state:
- For service-wide protection, share a single instance
- For per-client or per-endpoint protection, create separate instances
- Consider dependency injection or singleton patterns for shared breakers

### 3. Granularity Matters
Choose the right level of protection:
- Too coarse: One breaker for all external services means one failure affects everything
- Too fine: Many breakers increase complexity and resource usage
- Group related services (e.g., all calls to a single third-party API) under one breaker

### 4. Recovery Testing
In HALF_OPEN state, the breaker allows limited traffic through:
- Ensure your fallback or default behavior can handle reduced functionality
- Monitor the health of recovering services during this period
- Adjust successThreshold based on how confident you need to be about recovery

### 5. Clock Synchronization
Timeouts rely on system clocks:
- Ensure clocks are synchronized in distributed systems
- Consider using logical clocks or lease mechanisms for critical systems

## Alternatives and Complements

### 1. Bulkhead Pattern
Isolates critical resources to prevent exhaustion:
- Use thread pools, semaphores, or connection pools
- Complements circuit breaker by limiting concurrent calls

### 2. Rate Limiting
Prevents overwhelming services with too many requests:
- Useful when services can handle some load but not peak traffic
- Works well with circuit breaker for layered protection

### 3. Timeout and Retry
Basic resilience patterns:
- Timeouts prevent indefinite waiting
- Retry with backoff handles transient errors
- Circuit breaker prevents useless retries when service is down

### 4. Graceful Degradation
Reduces functionality rather than failing completely:
- Show cached data when fresh data unavailable
- Disable non-features when services unavailable
- Circuit breaker helps determine when to degrade

---
*Last updated: $(date '+%Y-%m-%d')*