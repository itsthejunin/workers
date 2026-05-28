import { describe, it, expect, mock } from "bun:test";
import { EmailProcessor } from "@boilerplate/processor/examples";
import { Job } from "bullmq";

describe("EmailProcessor", () => {
  it("should validate and handle the job correctly", async () => {
    const processor = new EmailProcessor();

    const mockJob = {
      id: "test-job-1",
      name: "send-email",
      data: {
        to: "test@example.com",
        subject: "Hello World",
      }
    } as unknown as Job;

    await expect(processor.validateAndHandle(mockJob)).resolves.toBeUndefined();
  });

  it("should fail validation if job data is incorrect", async () => {
    const processor = new EmailProcessor();

    const mockJob = {
      id: "test-job-2",
      name: "send-email",
      data: {
        to: "not-an-email",
      }
    } as unknown as Job;

    await expect(processor.validateAndHandle(mockJob)).rejects.toThrow();
  });
});
