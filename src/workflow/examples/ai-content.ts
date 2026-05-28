import { FlowBuilder } from "../builder";
import type { WorkflowDefinition } from "../types";

export function createAiContentFlow(
  topic: string,
  tone = "professional",
  maxWords = 1000
): WorkflowDefinition {
  return new FlowBuilder("ai-content-generation")
    .queue("content-queue")
    .initialData({ topic, tone, maxWords })
    .step("ai-research", { topic, tone })
    .step("ai-outline")
    .dependsOn("ai-research")
    .step("ai-write")
    .dependsOn("ai-outline")
    .step("ai-review")
    .dependsOn("ai-write")
    .step("ai-publish")
    .dependsOn("ai-review")
    .build();
}
