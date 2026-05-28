# Architecture

## Overview

This boilerplate implements a **background job processing system** with advanced features including **job flows/workflows**, **circuit breaker pattern**, **batch processing**, and comprehensive observability.

## Core Components

### Job Processing Pipeline
The system processes jobs through this pipeline:
1. **Job Submission**: Via `jobDisposer` or API endpoints
2. **Queue Storage**: Jobs stored in Redis via BullMQ
3. **Worker Processing**: Workers pull jobs from queues
4. **Validation & Handling**: 
   - Schema validation with Zod
   - Business logic execution in processors
5. **Result Handling**: Success/failure logging and metrics

### Key Patterns

#### BaseProcessor
All processors extend `BaseProcessor<T, R>` which provides:
- `schema`: Zod schema for runtime validation
- `handle(job)`: Business logic returning type `R`
- `validateAndHandle(job)`: Validates then handles (called by workers)

#### Job Flow / Workflow System
Jobs can be organized in trees with parent-child dependencies:
- **Children execute first**, parents wait for all children to complete
- Parents can access children's results via `job.getChildrenValues()`
- Supports complex DAGs (Directed Acyclic Graphs)
- Built on BullMQ's FlowProducer

#### Circuit Breaker
Provides fault tolerance for external service calls:
- **States**: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing)
- **Failure Tracking**: Counts consecutive failures
- **Recovery**: Automatically tests recovery after timeout
- **Fallback**: Optional fallback function when open

#### Batch Processing
Efficient processing of homogeneous job batches:
- `BatchProcessor<T>` processes `Job<T>[]` arrays
- Reduces queue overhead for bulk operations
- Maintains ordering and error isolation per item

#### Shared Resources
- **Redis Connection**: Single shared connection for all BullMQ queues, rate limiter, and telemetry
- **Connection Pooling**: Optimized for high concurrency scenarios
- **Graceful Shutdown**: Proper cleanup of all resources

## Directory Structure

```
src/
├── config/        # Environment config, queues, feature flags
├── processor/     # Job processors (extend BaseProcessor)
│   └── flow/      # Specialized processors for workflows
├── workflow/      # Flows / Workflows (manager, builder, examples)
├── queue/         # Queue initialization and job dispatching
├── worker/        # Worker runner
├── registry/      # Processor registry
├── middleware/    # HTTP middleware (auth, rate limit, logging, security)
├── health/        # Health checks
├── metrics/       # Prometheus metrics
├── system/        # Telemetry
├── shared/        # Shared job and flow schemas
├── utils/         # Utilities (logger, errors, test helpers, circuit breaker)
```

## Data Flow

```
Client → jobDisposer → Queue (Redis/BullMQ) → Worker → Processor
                                  ↑               ↓
                              [Children Results] ← [Parent waits for children]
                              [Circuit Breaker] ← [External calls]
                              [Metrics & Logs] ← [Observability]
```

## Reliability Features

1. **Job Retries**: Configurable per queue with exponential backoff
2. **Dead Letter Queue**: Failed jobs automatically moved after max attempts
3. **Circuit Breaker**: Prevents cascading failures from external services
4. **Job Deduplication**: Prevents duplicate processing within time windows
5. **Graceful Degradation**: System continues operating when non-critical services fail
6. **Health Checks**: Comprehensive monitoring of Redis and queue status

## Scalability Features

1. **Priority Queues**: Different queues for different priority levels
2. **Worker Concurrency**: Configurable per queue based on workload type
3. **Shared Resources**: Single Redis connection reduces connection overhead
4. **Batch Processing**: Reduces queue pressure for bulk operations
5. **Horizontal Scaling**: Multiple workers can process same queue

## Technology Choices

- **BullMQ v5**: Mature, feature-rich job queue for Node.js/Bun
- **Hono**: Ultra-fast web framework with excellent TypeScript support
- **Zod**: Runtime schema validation with TypeScript integration
- **Pino**: High-performance structured logging
- **ioredis**: Robust Redis client with built-in resilience
- **Rate-limiter-flexible**: Advanced rate limiting algorithms
- **Opossum** (circuit breaker): Battle-tested fault tolerance library

---
*Last updated: $(date '+%Y-%m-%d')*