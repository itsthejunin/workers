# Quick Start Guide

## Prerequisites
- **Bun**: Runtime (install via `curl -fsSL https://bun.sh/install | bash`)
- **Docker**: For Redis and optional Redis Commander

## Setup

```bash
# 1. Start Redis (with optional Redis Commander for visualization)
docker compose up -d

# 2. Install dependencies
bun install

# 3. Copy environment variables
cp .env.example .env

# 4. (Optional) Compile Workbench UI
bun run build:ui
```

## Starting Services

In separate terminal tabs:

```bash
# Terminal 1: Start workers
bun run worker

# Terminal 2: Start API server + Workbench
bun run server
```

The server will be available at http://localhost:3000
Workbench dashboard at http://localhost:3000/admin

## Creating a Standard Job

Use the scaffold script:

```bash
bun run make:job ProcessPayment
```

This will:
1. Create `src/processor/process-payment.ts`
2. Register the schema in `src/shared/jobs.ts`
3. Register the processor in `src/registry/index.ts`

Then implement your business logic in the `handle()` method.

## Creating Workflows

### AI Content Generation Flow (Sequential Chain)
```bash
# Create the flow definition file
touch src/workflow/examples/my-ai-flow.ts
```

```typescript
// src/workflow/examples/my-ai-flow.ts
import { createAiContentFlow } from "./ai-content";

export function createMyAiFlow(topic: string, tone = "professional") {
  return createAiContentFlow(topic, tone);
}
```

Then trigger it:
```bash
# Via curl
curl -X POST http://localhost:3000/api/flows/ai-content \
  -H 'Content-Type: application/json' \
  -d '{"topic":"Serverless AI","tone":"technical"}'

# Via Bun script
bun run src/workflow/examples/ai-content.ts | bun run -
```

### Data Pipeline ETL Flow (Fan-in Parallel)
```bash
curl -X POST http://localhost:3000/api/flows/data-pipeline \
  -H 'Content-Type: application/json' \
  -d '{"source":"postgres","table":"analytics","mode":"incremental"}'
```

### Notification Flow (Fan-out)
```bash
curl -X POST http://localhost:3000/api/flows/notification \
  -H 'Content-Type: application/json' \
  -d '{"userId":"user-123","type":"both","title":"Welcome!","body":"Hello World"}'
```

## Checking Workflow Status

After starting a workflow, check its status:

```bash
curl http://localhost:3000/api/flows/content-queue/<PARENT_JOB_ID>
```

Replace `<PARENT_JOB_ID>` with the parentJobId from the flow creation response.

## Running Tests

```bash
# Run all tests
bun test

# Run workflow-specific tests
bun test tests/workflow/

# Run processor tests
bun test tests/processor/
bun test tests/processors/
```

## Configuration

Edit `.env.example` to customize:
- `NODE_ENV`: development/production/test
- `PORT`: Server port (default: 3000)
- `REDIS_HOST/PORT`: Redis connection
- `FEATURE_*`: Toggle features on/off
- `RATE_LIMIT_*`: Rate limiting configuration
- `DEFAULT_JOB_*`: Default job processing settings
- `HEALTH_CHECK_INTERVAL`: Health check frequency in ms

For advanced queue configuration, set `QUEUES_CONFIG` as JSON:
```bash
QUEUES_CONFIG='{"email-queue":{"workerConcurrency":10,"priority":1},"pipeline-queue":{"priority":5}}'
```

---
*Last updated: $(date '+%Y-%m-%d')*