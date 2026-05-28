import { z } from "zod";

export const FLOW_SCHEMAS = {
  AI_CONTENT: {
    name: "ai-content-generation",
    schema: z.object({
      topic: z.string().min(1),
      tone: z.string().optional().default("professional"),
      maxWords: z.number().positive().optional().default(1000),
    }),
  },

  DATA_PIPELINE: {
    name: "data-pipeline",
    schema: z.object({
      source: z.string().min(1),
      table: z.string().min(1),
      mode: z.enum(["full-refresh", "incremental"]).default("incremental"),
    }),
  },

  NOTIFICATION: {
    name: "notification-delivery",
    schema: z.object({
      userId: z.string().min(1),
      type: z.enum(["email", "push", "both"]).default("both"),
      title: z.string().min(1),
      body: z.string().min(1),
      priority: z.enum(["low", "normal", "high"]).default("normal"),
    }),
  },
} as const;
