import type { WorkflowDefinition, FlowStep } from "../types";

export function createDataPipelineFlow(
  source: string,
  table: string,
  mode: "full-refresh" | "incremental" = "incremental"
): WorkflowDefinition {
  const extractUsers: FlowStep = {
    name: "extract-users",
    queueName: "pipeline-queue",
    data: { source, entity: "users" },
  };

  const extractOrders: FlowStep = {
    name: "extract-orders",
    queueName: "pipeline-queue",
    data: { source, entity: "orders" },
  };

  const extractProducts: FlowStep = {
    name: "extract-products",
    queueName: "pipeline-queue",
    data: { source, entity: "products" },
  };

  const transform: FlowStep = {
    name: "transform",
    queueName: "pipeline-queue",
    data: { table, mode },
    children: [extractUsers, extractOrders, extractProducts],
  };

  const load: FlowStep = {
    name: "load",
    queueName: "pipeline-queue",
    data: { table, mode },
    children: [transform],
  };

  return {
    name: "data-pipeline",
    queueName: "pipeline-queue",
    data: { source, table, mode },
    steps: [load],
  };
}
