import type { FlowStep, WorkflowDefinition } from "./types";

export class FlowBuilder {
  private name: string;
  private queueName = "default-queue";
  private data: Record<string, unknown> = {};
  private steps: FlowStep[] = [];

  constructor(name: string) {
    this.name = name;
  }

  queue(name: string): FlowBuilder {
    this.queueName = name;
    return this;
  }

  initialData(data: Record<string, unknown>): FlowBuilder {
    this.data = data;
    return this;
  }

  step(name: string, data?: Record<string, unknown>): FlowBuilder {
    this.steps.push({ name, queueName: this.queueName, data });
    return this;
  }

  stepWithQueue(name: string, customQueue: string, data?: Record<string, unknown>): FlowBuilder {
    this.steps.push({ name, queueName: customQueue, data });
    return this;
  }

  dependsOn(_previousStepName: string): FlowBuilder {
    return this;
  }

  build(): WorkflowDefinition {
    if (this.steps.length === 0) {
      return { name: this.name, queueName: this.queueName, data: this.data, steps: [] };
    }

    // BullMQ: children execute first, parents execute last.
    // For chain A → B → C → D → E (execute in this order):
    //   E = root parent (executes last)
    //   D = child of E, but parent of C
    //   C = child of D, but parent of B
    //   B = child of C, but parent of A
    //   A = child of B, leaf (executes first)
    //
    // Tree: E.children = [D], D.children = [C], C.children = [B], B.children = [A]

    for (let i = 0; i < this.steps.length - 1; i++) {
      // steps[i] is child of steps[i+1]
      // steps[i] needs to be added to steps[i+1]'s children
      // But we must be careful not to mutate the original step objects
      const parentStep: FlowStep = {
        name: this.steps[i + 1].name,
        queueName: this.steps[i + 1].queueName,
        data: this.steps[i + 1].data,
        children: this.steps[i + 1].children,
      };

      const childStep: FlowStep = {
        name: this.steps[i].name,
        queueName: this.steps[i].queueName,
        data: this.steps[i].data,
        children: this.steps[i].children,
      };

      if (parentStep.children) {
        parentStep.children = [...parentStep.children, childStep];
      } else {
        parentStep.children = [childStep];
      }

      // Replace the parent in the array with the updated version
      this.steps[i + 1] = parentStep;
    }

    const rootStep = this.steps[this.steps.length - 1];

    return {
      name: this.name,
      queueName: this.queueName,
      data: this.data,
      steps: [rootStep],
    };
  }
}
