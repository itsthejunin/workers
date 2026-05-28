import { describe, it, expect } from "bun:test";
import { EmailProcessor, PdfProcessor, MetricsProcessor } from "@boilerplate/processor/examples";
import { createMockJob } from "../../src/utils/test-utils";

describe("EmailProcessor", () => {
  it("should validate and handle the job correctly", async () => {
    const processor = new EmailProcessor();
    const mockJob = createMockJob("send-email", {
      to: "test@example.com",
      subject: "Hello World",
    });

    await expect(processor.validateAndHandle(mockJob)).resolves.toBeUndefined();
  });

  it("should fail validation if job data is incorrect", async () => {
    const processor = new EmailProcessor();
    const mockJob = createMockJob("send-email", {
      to: "not-an-email",
    });

    await expect(processor.validateAndHandle(mockJob)).rejects.toThrow();
  });
});

describe("PdfProcessor", () => {
  it("should validate and handle the job correctly", async () => {
    const processor = new PdfProcessor();
    const mockJob = createMockJob("process-pdf", {
      documentId: "doc-123",
    });

    await expect(processor.validateAndHandle(mockJob)).resolves.toBeUndefined();
  });

  it("should fail validation if job data is incorrect", async () => {
    const processor = new PdfProcessor();
    const mockJob = createMockJob("process-pdf", {});

    await expect(processor.validateAndHandle(mockJob)).rejects.toThrow();
  });
});

describe("MetricsProcessor", () => {
  it("should validate and handle the job correctly", async () => {
    const processor = new MetricsProcessor();
    const mockJob = createMockJob("sync-metrics", { value: 42 });

    await expect(processor.validateAndHandle(mockJob)).resolves.toBeUndefined();
  });
});
