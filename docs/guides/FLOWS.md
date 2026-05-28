# Flows & Workflows Guide

This guide explains how to use the workflow/flow system in the boilerplate for creating complex job dependencies and pipelines.

## Overview

The workflow system allows you to define **job dependencies** in tree structures where:
- **Child jobs execute first**
- **Parent jobs wait for all children to complete**
- **Parent jobs can access children's results**
- **Complex DAGs (Directed Acyclic Graphs) are supported**

Built on top of BullMQ's FlowProducer, the system provides:
- Type-safe workflow definitions
- Fluent builder API
- Pre-built examples for common patterns
- Observability and monitoring
- Error handling and retry mechanisms

## Core Concepts

### Job Tree Structure
In a job tree:
- **Leaf nodes**: Jobs with no children (execute first)
- **Internal nodes**: Jobs with children (execute after children)
- **Root node**: The top-level job (executes last)

Execution order: **Leaves → Internal nodes → Root**

### Data Flow
- Parent jobs receive children's results via `job.getChildrenValues()`
- Returns a map: `{ [jobId]: childResult }`
- Allows parents to aggregate, filter, or make decisions based on children's outcomes

### Error Propagation
- If any child fails, the parent still executes (unless configured otherwise)
- Parents can check for failed children and decide how to handle them
- Failed children return `null` or error info in `getChildrenValues()`

## API Reference

### WorkflowManager
Main interface for creating and managing workflows.

#### `create(def: WorkflowDefinition): Promise<WorkflowResult>`
Creates a workflow from a definition.

#### `createChain(queueName: string, steps: FlowStep[]): Promise<WorkflowResult>`
Creates a sequential chain where steps execute in order.

#### `getFlowStatus(queueName: string, parentJobId: string): Promise<FlowStatus | null>`
Gets detailed status of all jobs in a workflow.

### FlowBuilder
Fluent API for constructing workflow definitions.

#### Methods
- `queue(name: string)` - Sets default queue for steps
- `initialData(data: Record<string, unknown>)` - Sets initial data for the workflow
- `step(name: string, data?: Record<string, unknown>)` - Adds a step
- `stepWithQueue(name: string, customQueue: string, data?: Record<string, unknown>)` - Adds a step with custom queue
- `dependsOn(previousStepName: string)` - Marks that this step depends on the previous one (for chains)
- `build(): WorkflowDefinition` - Builds the workflow definition

### WorkflowDefinition
Interface for defining a workflow:
```typescript
interface WorkflowDefinition<T = any> {
  name: string;           // Workflow name
  queueName: string;      // Queue for the root/parent job
  data?: T;               // Initial data passed to the workflow
  steps: FlowStep[];      // Top-level steps (can be parallel)
}
```

### FlowStep
Definition of a single step in a workflow:
```typescript
interface FlowStep<T = any> {
  name: string;           // Job name (must match a registered processor)
  queueName: string;      // Queue where this job runs
  data?: T;               // Job-specific data
  opts?: JobsOptions;     // BullMQ job options (attempts, backoff, etc.)
  children?: FlowStep[];  // Child steps (if any)
}
```

## Built-in Examples

### 1. AI Content Generation (`src/workflow/examples/ai-content.ts`)
Creates a sequential chain for generating AI-assisted content:

```
research → outline → write → review → publish
```

Each step depends on the previous one, forming a linear chain.

**Steps:**
- **ai-research**: Researches the topic → returns `{ sources: string[], summary: string }`
- **ai-outline**: Creates an outline based on research → returns `{ sections: string[], structure: string }`
- **ai-write**: Writes content based on outline → returns `{ content: string, wordCount: number }`
- **ai-review**: Reviews the content → returns `{ score: number, feedback: string, approved: boolean }`
- **ai-publish**: Publishes the final article → returns `{ publishedAt: string, articleId: string }`

**Usage:**
```typescript
import { createAiContentFlow } from "./src/workflow/examples/ai-content";

const flow = createAiContentFlow("Serverless AI Trends", "technical");
const result = await flowManager.create(flow);
```

### 2. Data Pipeline ETL (`src/workflow/examples/data-pipeline.ts`)
Extract-Transform-Load pattern with parallel extraction:

```
        ┌─ extract-users ─┐
extract ─┼─ extract-orders ─┼── transform ── load
        └─ extract-products ┘
```

**Steps:**
- **extract-users**: Extracts users table → returns `{ recordsExtracted: number, entity: "users" }`
- **extract-orders**: Extracts orders table → returns `{ recordsExtracted: number, entity: "orders" }`
- **extract-products**: Extracts products table → returns `{ recordsExtracted: number, entity: "products" }`
- **transform**: Combines and transforms data → returns `{ rowsTransformed: number, table: string }`
- **load**: Loads data to destination → returns `{ loaded: boolean, table: string, rowsLoaded: number }`

**Usage:**
```typescript
import { createDataPipelineFlow } from "./src/workflow/examples/data-pipeline";

const flow = createDataPipelineFlow("postgres", "analytics", "incremental");
const result = await flowManager.create(flow);
```

### 3. Notification Flow (`src/workflow/examples/notification.ts`)
Fan-out pattern for multi-channel notifications:

```
parent: "log-delivery"
├── child: "check-preferences"
├── child: "format-message"
├── child: "send-email"
└── child: "send-push"
```

**Steps:**
- **check-preferences**: Gets user notification preferences → returns `{ emailEnabled: boolean, pushEnabled: boolean }`
- **format-message**: Formats the notification message → returns `{ formattedTitle: string, formattedBody: string }`
- **send-email**: Sends email notification → returns `{ sent: boolean, channel: string, messageId: string }`
- **send-push**: Sends push notification → returns `{ sent: boolean, channel: string, messageId: string }`
- **log-delivery**: Logs delivery results (parent job) → aggregates results from all children

**Usage:**
```typescript
import { createNotificationFlow } from "./src/workflow/examples/notification";

const flow = createNotificationFlow("user-123", "both", "Welcome!", "Hello World");
await flowManager.create(flow);
```

## Creating Custom Workflows

### Method 1: Using the Fluent Builder
```typescript
import { FlowBuilder } from "./src/workflow/builder";
import { flowManager } from "./src/workflow/manager";

const workflow = new FlowBuilder("image-processing")
  .queue("media-queue")
  .initialData({ imageUrl: "https://example.com/image.jpg" })
  .step("download-image", { width: 1920, height: 1080 })
  .step("resize-image")
    .dependsOn("download-image")
  .step("apply-filter")
    .dependsOn("resize-image")
  .step("upload-image")
    .dependsOn("apply-filter")
  .build();

const result = await flowManager.create(workflow);
```

### Method 2: Direct Definition
```typescript
import type { WorkflowDefinition } from "./src/workflow/types";
import { flowManager } from "./src/workflow/manager";

const workflow: WorkflowDefinition = {
  name: "report-generation",
  queueName: "report-queue",
  data: { reportType: "monthly", year: 2024 },
  steps: [
    {
      name: "collect-data",
      queueName: "report-queue",
      data: { year: 2024 }
    },
    {
      name: "analyze-trends",
      queueName: "report-queue",
      data: {},
      children: [
        {
          name: "collect-sales",
          queueName: "report-queue",
          data: { year: 2024 }
        },
        {
          name: "collect-expenses",
          queueName: "report-queue",
          data: { year: 2024 }
        }
      ]
    },
    {
      name: "generate-report",
      queueName: "report-queue",
      data: { format: "PDF" },
      children: [
        {
          name: "analyze-trends",
          queueName: "report-queue",
          data: {}
        }
      ]
    }
  ]
};

const result = await flowManager.create(workflow);
```

### Method 3: Using Disposer (Internal)
```typescript
import { jobDisposer } from "./src/queue/disposer";

// For workflow definitions
await jobDisposer.startFlow(myWorkflowDefinition);

// For chains
await jobDisposer.startChain("processing-queue", [
  { name: "step-a", data: { value: 1 } },
  { name: "step-b", data: { value: 2 } },
  { name: "step-c", data: { value: 3 } }
]);

// Check status
const status = await jobDisposer.getFlowStatus("processing-queue", parentJobId);
```

## Error Handling in Workflows

Processors in workflows should handle errors appropriately:

```typescript
import { BaseProcessor } from "@boilerplate/processor/base";
import { AppError } from "../../utils/AppError";
import { z } from "zod";

export class ExternalApiProcessor extends BaseProcessor<ApiRequestData, ApiResponseData> {
  schema = z.object({ endpoint: z.string(), params: z.object() });

  async handle(job: any): Promise<ApiResponseData> {
    try {
      // External API call that might fail
      const response = await fetchExternalApi(job.data);
      return response;
    } catch (error) {
      // Convert to structured AppError for better handling
      throw AppError.externalService("ExternalAPI", error);
    }
  }
}
```

In parent jobs, check for failed children:

```typescript
export class ReportAggregatorProcessor extends BaseProcessor<ReportData, ReportResult> {
  schema = z.object({ reportType: z.string() });

  async handle(job: any): Promise<ReportResult> {
    const childrenValues = await job.getChildrenValues();
    
    // Check for failed children
    const failedChildren = Object.entries(childrenValues)
      .filter(([_, result]) => result instanceof Error || result === null);
    
    if (failedChildren.length > 0) {
      // Handle partial failures - maybe proceed with available data
      logger.warn({ failedCount: failedChildren.length }, "Some workflow steps failed");
    }
    
    // Process successful results
    const successfulResults = Object.entries(childrenValues)
      .filter(([_, result]) => !(result instanceof Error || result === null))
      .map(([_, result]) => result);
    
    // Aggregate results...
    return { /* aggregated result */ };
  }
}
```

## Observability

### Logging
Each workflow step generates structured logs:
```json
{
  "flowId": "workflow-name-123abc",
  "step": "step-name",
  "status": "started|completed|failed",
  "durationMs": 1234,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Metrics
Prometheus metrics are automatically collected:
```
# HELP flow_steps_total Total number of workflow steps executed
# TYPE flow_steps_total counter
flow_steps_total{workflow="ai-content",step="write",status="completed"} 42
flow_steps_total{workflow="ai-content",step="review",status="failed"} 3

# HELP flow_duration_seconds Duration of workflow execution in seconds
# TYPE flow_duration_seconds histogram
flow_duration_seconds_bucket{workflow="ai-content",le="5"} 10
flow_duration_seconds_bucket{workflow="ai-content",le="10"} 25
flow_duration_seconds_bucket{workflow="ai-content",le="25"} 40
flow_duration_seconds_sum{workflow="ai-content"} 420.5
flow_duration_seconds_count{workflow="ai-content"} 42
```

### Tracking in Workbench
The Workbench dashboard shows:
- Active workflows
- Completed/failed workflows
- Step-by-step progress
- Execution times
- Error details

## Best Practices

### 1. Keep Steps Idempotent
Design steps to be safely retryable:
- Use idempotency keys for external API calls
- Check if work was already done before starting
- Make database operations upserts when possible

### 2. Handle Partial Failures
Anticipate that some children might fail:
- Check `getChildrenValues()` for null/error results
- Decide whether to proceed with available data or fail the parent
- Log failures appropriately for debugging

### 3. Optimize for Parallelism
Identify opportunities for parallel execution:
- Group independent steps under the same parent
- Avoid unnecessary sequential dependencies
- Use fan-in patterns for aggregation workloads

### 4. Set Appropriate Timeouts
Configure job timeouts based on expected execution:
- Short timeouts for fast operations (validation, formatting)
- Longer timeouts for slow operations (external API calls, data processing)
- Use exponential backoff for retries

### 5. Monitor and Alert
Set up alerts for:
- Workflow failure rates
- Execution time outliers
- Queue depth increases
- Worker utilization

## Common Patterns

### Sequential Chain (A → B → C → D)
Use when each step depends on the previous one's output:
```typescript
new FlowBuilder("sequential")
  .step("step-a")
  .step("step-b").dependsOn("step-a")
  .step("step-c").dependsOn("step-b")
  .step("step-d").dependsOn("step-c")
```

### Fan-In Parallel (Multiple → One)
Use when multiple inputs need to be combined:
```typescript
// Tree structure:
//       parent
//      /  |  \
//   child1 child2 child3
```

### Fan-Out One (One → Multiple)
Use when one input needs to be processed in multiple ways:
```typescript
// Tree structure:
//    parent
//   /  |  \
// child1 child2 child3
```

### Complex DAG
For complex dependencies, build the tree directly:
```typescript
const workflow: WorkflowDefinition = {
  name: "complex-workflow",
  queueName: "work-queue",
  steps: [
    {
      name: "final-step",
      queueName: "work-queue",
      children: [
        {
          name: "middle-a",
          queueName: "work-queue",
          children: [
            { name: "leaf-1", queueName: "work-queue", data: {} },
            { name: "leaf-2", queueName: "work-queue", data: {} }
          ]
        },
        {
          name: "middle-b",
          queueName: "work-queue",
          children: [
            { name: "leaf-3", queueName: "work-queue", data: {} },
            { name: "leaf-4", queueName: "work-queue", data: {} }
          ]
        }
      ]
    }
  ]
};
```

## Troubleshooting

### Workflow Not Starting
- Check that all step names match registered processors
- Verify queue names exist in configuration
- Ensure Redis connection is working

### Steps Not Executing in Expected Order
- Remember: leaves execute first, root executes last
- Check your tree structure - the root should be the LAST step to execute
- Use the builder or createChain() for sequential chains

### Missing Child Results in Parent
- Ensure child jobs completed successfully (not failed)
- Check that job IDs in `getChildrenValues()` match expectations
- Verify that children actually returned data from their handle() method

### High Memory Usage
- Large result objects passed between steps can increase memory usage
- Consider storing large results in Redis/database and passing only references
- Clear large objects when no longer needed

## Integration with Existing System

Workflows integrate seamlessly with the existing job processing system:

### Processors
Workflow steps use the same `BaseProcessor` as regular jobs:
```typescript
export class MyWorkflowStep extends BaseProcessor<MyData, MyResult> {
  // Same interface as regular processors
}
```

### Queues
Each step can specify its own queue:
```typescript
.step("fast-step", { data: {} })           // Uses default queue
.stepWithQueue("slow-step", "slow-queue", { data: {} }) // Uses custom queue
```

### Disposer
Internal workflow triggering via `jobDisposer`:
```typescript
await jobDisposer.startFlow(workflowDefinition);
```

### Observability
Workflow metrics and logs integrate with existing systems:
- Same logging format and levels
- Same metrics namespace and labels
- Same health check endpoints

## Limitations

### Maximum Depth
Practical limit of ~100 levels deep due to:
- Call stack limitations in tree traversal
- Message size limits in Redis
- Consider breaking very deep workflows into multiple flows

### Result Size
Large result objects passed between steps:
- Are serialized/deserialized multiple times
- Can impact performance and memory usage
- Consider using references for large data

### Transactionality
Workflows are not atomic transactions:
- Individual steps can succeed/fail independently
- Consider implementing compensation transactions for critical workflows
- Use the Saga pattern for long-running workflows with rollback needs

---
*Last updated: $(date '+%Y-%m-%d')*