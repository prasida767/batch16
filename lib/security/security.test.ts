import { describe, expect, it } from "vitest";
import { sanitizeUserText, stripControlChars } from "@/lib/security/sanitize";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("sanitizeUserText", () => {
  it("strips control characters and trims", () => {
    expect(stripControlChars("hi\u0000there")).toBe("hithere");
    expect(sanitizeUserText("  hello\n\n\nworld  ", 100)).toBe("hello\n\nworld");
  });

  it("enforces max length", () => {
    expect(sanitizeUserText("abcdef", 3)).toBe("abc");
  });
});

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
  });
});
