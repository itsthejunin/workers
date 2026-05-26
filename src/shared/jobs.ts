import { z } from "zod";

export const JOBS = {
  EMAIL: {
    name: "send-email",
    schema: z.object({ to: z.string().email(), subject: z.string() }),
  },
  PDF: {
    name: "process-pdf",
    schema: z.object({ documentId: z.string() }),
  },
  METRICS: {
    name: "sync-metrics",
    schema: z.object({ value: z.number() }),
  },
} as const;
