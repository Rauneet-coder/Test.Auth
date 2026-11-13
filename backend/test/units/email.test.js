import { describe, it, expect, vi } from "vitest";
import nodemailer from "nodemailer";

describe("sendEmail service", () => {
    it("should propagate errors when nodemailer fails instead of swallowing them", async () => {
        const mockSendMail = vi.fn().mockRejectedValue(new Error("Network transport failure"));
        vi.spyOn(nodemailer, "createTransport").mockReturnValue({
            sendMail: mockSendMail,
            verify: vi.fn()
        });

        const { sendEmail } = await import("../../src/services/email.service.js");

        await expect(
            sendEmail("test@example.com", "Subject", "Text", "<p>Html</p>")
        ).rejects.toThrow("Network transport failure");

        vi.restoreAllMocks();
    });
});

