import { describe, it, expect } from "bun:test";
import { FlowBuilder } from "../../src/workflow/builder";

describe("FlowBuilder", () => {
  it("should build a single-step workflow", () => {
    const def = new FlowBuilder("single")
      .queue("test-queue")
      .step("step-a")
      .build();

    expect(def.name).toBe("single");
    expect(def.queueName).toBe("test-queue");
    expect(def.steps).toHaveLength(1);
    expect(def.steps[0].name).toBe("step-a");
    expect(def.steps[0].children).toBeUndefined();
  });

  it("should build a chain in correct order (first executes first, last executes last)", () => {
    const def = new FlowBuilder("chain")
      .queue("test-queue")
      .step("step-a", { value: 1 })
      .step("step-b", { value: 2 })
      .step("step-c", { value: 3 })
      .build();

    // Root = last step (step-c), it should have step-b as child, which has step-a as child
    expect(def.steps).toHaveLength(1);
    const root = def.steps[0];
    expect(root.name).toBe("step-c");
    expect(root.children).toHaveLength(1);

    const middle = root.children![0];
    expect(middle.name).toBe("step-b");
    expect(middle.children).toHaveLength(1);

    const first = middle.children![0];
    expect(first.name).toBe("step-a");
    expect(first.children).toBeUndefined();
  });

  it("should handle empty workflow", () => {
    const def = new FlowBuilder("empty").queue("test-queue").build();
    expect(def.steps).toHaveLength(0);
  });

  it("should preserve step data through chain", () => {
    const def = new FlowBuilder("data-test")
      .queue("test-queue")
      .step("step-a", { value: 42 })
      .step("step-b", { value: 99 })
      .build();

    const root = def.steps[0];
    expect(root.data).toEqual({ value: 99 });
    const child = root.children![0];
    expect(child.data).toEqual({ value: 42 });
  });

  it("should support custom queue per step", () => {
    const def = new FlowBuilder("multi-queue")
      .queue("default-queue")
      .step("step-a")
      .stepWithQueue("step-b", "custom-queue")
      .build();

    const root = def.steps[0];
    expect(root.name).toBe("step-b");
    expect(root.queueName).toBe("custom-queue");
    expect(root.children![0].queueName).toBe("default-queue");
  });
});
