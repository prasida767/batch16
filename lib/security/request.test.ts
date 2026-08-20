import { describe, expect, it } from "vitest";
import { rejectCrossOrigin } from "@/lib/security/request";

function post(url: string, origin?: string) {
  return new Request(url, {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

describe("rejectCrossOrigin", () => {
  it("allows same-origin browser posts", () => {
    const req = post(
      "https://batch16.vercel.app/api/chat",
      "https://batch16.vercel.app",
    );
    expect(rejectCrossOrigin(req)).toBeNull();
  });

  it("allows missing Origin (non-browser / same-site navigations)", () => {
    const req = post("https://batch16.vercel.app/api/chat");
    expect(rejectCrossOrigin(req)).toBeNull();
  });

  it("rejects a foreign site Origin", () => {
    const req = post(
      "https://batch16.vercel.app/api/chat",
      "https://evil.example",
    );
    const res = rejectCrossOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
