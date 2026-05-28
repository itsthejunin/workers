import type { WorkflowDefinition, FlowStep } from "../types";

export function createNotificationFlow(
  userId: string,
  type: "email" | "push" | "both",
  title: string,
  body: string,
  priority: "low" | "normal" | "high" = "normal"
): WorkflowDefinition {
  const children: FlowStep[] = [
    {
      name: "check-preferences",
      queueName: "notification-queue",
      data: { userId },
    },
  ];

  if (type === "email" || type === "both") {
    children.push({
      name: "format-message",
      queueName: "notification-queue",
      data: { title, body, channel: "email" },
    });
    children.push({
      name: "flow-send-email",
      queueName: "notification-queue",
      data: { userId, title, body },
    });
  }

  if (type === "push" || type === "both") {
    children.push({
      name: "send-push",
      queueName: "notification-queue",
      data: { userId, title, body },
    });
  }

  const logDelivery: FlowStep = {
    name: "log-delivery",
    queueName: "notification-queue",
    data: { userId, type, title },
    children,
  };

  return {
    name: "notification-delivery",
    queueName: "notification-queue",
    data: { userId, type, priority },
    steps: [logDelivery],
  };
}
