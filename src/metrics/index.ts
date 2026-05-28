import { Queue } from 'bullmq';

export interface JobMetrics {
  jobsProcessed: number;
  jobsFailed: number;
  jobsCompleted: number;
  averageProcessingTime: number;
  lastProcessedAt: string | null;
}

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

export interface SystemMetrics {
  queues: QueueMetrics[];
  timestamp: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export async function collectQueueMetrics(queue: Queue): Promise<QueueMetrics> {
  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return {
    name: queue.name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    isPaused,
  };
}

export async function collectSystemMetrics(queues: Record<string, Queue>): Promise<SystemMetrics> {
  const queueMetrics = await Promise.all(
    Object.values(queues).map(queue => collectQueueMetrics(queue))
  );

  const memUsage = process.memoryUsage();

  return {
    queues: queueMetrics,
    timestamp: Date.now(),
    uptime: process.uptime(),
    memoryUsage: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
  };
}

export function formatPrometheusMetrics(metrics: SystemMetrics): string {
  const lines: string[] = [];

  lines.push('# HELP queue_jobs_waiting Number of jobs waiting to be processed');
  lines.push('# TYPE queue_jobs_waiting gauge');
  for (const q of metrics.queues) {
    lines.push(`queue_jobs_waiting{queue="${q.name}"} ${q.waiting}`);
  }

  lines.push('');
  lines.push('# HELP queue_jobs_active Number of jobs currently being processed');
  lines.push('# TYPE queue_jobs_active gauge');
  for (const q of metrics.queues) {
    lines.push(`queue_jobs_active{queue="${q.name}"} ${q.active}`);
  }

  lines.push('');
  lines.push('# HELP queue_jobs_completed Total number of completed jobs');
  lines.push('# TYPE queue_jobs_completed counter');
  for (const q of metrics.queues) {
    lines.push(`queue_jobs_completed{queue="${q.name}"} ${q.completed}`);
  }

  lines.push('');
  lines.push('# HELP queue_jobs_failed Total number of failed jobs');
  lines.push('# TYPE queue_jobs_failed counter');
  for (const q of metrics.queues) {
    lines.push(`queue_jobs_failed{queue="${q.name}"} ${q.failed}`);
  }

  lines.push('');
  lines.push('# HELP queue_jobs_delayed Number of delayed jobs');
  lines.push('# TYPE queue_jobs_delayed gauge');
  for (const q of metrics.queues) {
    lines.push(`queue_jobs_delayed{queue="${q.name}"} ${q.delayed}`);
  }

  lines.push('');
  lines.push('# HELP queue_paused Whether the queue is paused (1 = paused, 0 = not paused)');
  lines.push('# TYPE queue_paused gauge');
  for (const q of metrics.queues) {
    lines.push(`queue_paused{queue="${q.name}"} ${q.isPaused ? 1 : 0}`);
  }

  lines.push('');
  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds counter');
  lines.push(`process_uptime_seconds ${metrics.uptime}`);

  lines.push('');
  lines.push('# HELP process_memory_usage_mb Process memory usage in MB');
  lines.push('# TYPE process_memory_usage_mb gauge');
  lines.push(`process_memory_usage_mb{type="rss"} ${metrics.memoryUsage.rss}`);
  lines.push(`process_memory_usage_mb{type="heap_total"} ${metrics.memoryUsage.heapTotal}`);
  lines.push(`process_memory_usage_mb{type="heap_used"} ${metrics.memoryUsage.heapUsed}`);
  lines.push(`process_memory_usage_mb{type="external"} ${metrics.memoryUsage.external}`);

  return lines.join('\n');
}

// Simple in-memory counter for job metrics
const jobCounters = new Map<string, { processed: number; failed: number; completed: number; totalDuration: number }>();

export function recordJobStart(queueName: string): void {
  if (!jobCounters.has(queueName)) {
    jobCounters.set(queueName, { processed: 0, failed: 0, completed: 0, totalDuration: 0 });
  }
  const counter = jobCounters.get(queueName)!;
  counter.processed++;
}

export function recordJobEnd(queueName: string, success: boolean, durationMs: number): void {
  const counter = jobCounters.get(queueName);
  if (counter) {
    if (success) {
      counter.completed++;
    } else {
      counter.failed++;
    }
    counter.totalDuration += durationMs;
  }
}
