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
  // AI Content Flow
  AI_RESEARCH: { name: "ai-research", schema: z.object({ topic: z.string() }) },
  AI_OUTLINE: { name: "ai-outline", schema: z.object({}) },
  AI_WRITE: { name: "ai-write", schema: z.object({}) },
  AI_REVIEW: { name: "ai-review", schema: z.object({}) },
  AI_PUBLISH: { name: "ai-publish", schema: z.object({}) },
  // Data Pipeline
  TRANSFORM: { name: "transform", schema: z.object({}) },
  LOAD: { name: "load", schema: z.object({}) },
  // Notification
  CHECK_PREFS: { name: "check-preferences", schema: z.object({}) },
  FORMAT_MESSAGE: { name: "format-message", schema: z.object({}) },
  SEND_EMAIL_FLOW: { name: "flow-send-email", schema: z.object({}) },
  SEND_PUSH: { name: "send-push", schema: z.object({}) },
  LOG_DELIVERY: { name: "log-delivery", schema: z.object({}) },
} as const;
