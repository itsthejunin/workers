import { Job } from "bullmq";

export function createMockJob(
  name: string,
  data: Record<string, unknown>,
  overrides: Partial<Job> = {}
): Job {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    data,
    opts: {},
    attemptsMade: 0,
    timestamp: Date.now(),
    processedOn: Date.now(),
    finishedOn: null,
    returnvalue: null,
    failedReason: null,
    stacktrace: [],
    ...overrides,
  } as unknown as Job;
}

export function createAsyncMockQueue(overrides: Record<string, any> = {}) {
  return {
    add: async (name: string, data: any, opts?: any) => ({ id: 'mock-job-id', name, data, opts }),
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
    getDelayedCount: async () => 0,
    isPaused: async () => false,
    close: async () => {},
    name: 'mock-queue',
    ...overrides,
  };
}

export function createMockWorker(overrides: Record<string, any> = {}) {
  return {
    close: async () => {},
    ...overrides,
  };
}
