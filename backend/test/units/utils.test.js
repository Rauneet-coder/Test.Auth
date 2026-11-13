import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import { generateOtp, getOtpHtml } from "../../src/utils/utils.js";

describe("generateOtp and utils", () => {
    it("should generate a 6-digit numeric string", () => {
        for (let i = 0; i < 50; i++) {
            const otp = generateOtp();
            expect(otp).toMatch(/^\d{6}$/);
            const num = parseInt(otp, 10);
            expect(num).toBeGreaterThanOrEqual(100000);
            expect(num).toBeLessThan(1000000);
        }
    });

    it("should use crypto.randomInt(100000, 1000000) so 999999 is included", () => {
        const spy = vi.spyOn(crypto, "randomInt");
        generateOtp();
        expect(spy).toHaveBeenCalledWith(100000, 1000000);
        spy.mockRestore();
    });

    it("should render OTP in the generated HTML template", () => {
        const html = getOtpHtml("999999");
        expect(html).toContain("999999");
        expect(html).toContain("Your OTP Code");
    });
});

