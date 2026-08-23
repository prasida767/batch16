import { describe, expect, it } from "vitest";
import {
  formatKickoffLocal,
  formatTimezoneLabel,
} from "@/lib/league/fixtures-time";

function hourInZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  return Number(parts.find((part) => part.type === "hour")?.value);
}

describe("fixture kick-off formatting", () => {
  it("returns TBD for missing or invalid times", () => {
    expect(formatKickoffLocal(null, "Europe/London")).toBe("TBD");
    expect(formatKickoffLocal("not-a-date", "Europe/London")).toBe("TBD");
  });

  it("formats the same UTC instant in the viewer's timezone", () => {
    const iso = "2026-08-23T14:00:00Z";
    expect(hourInZone(iso, "Europe/London")).toBe(15);
    expect(hourInZone(iso, "Asia/Tokyo")).toBe(23);
    expect(formatKickoffLocal(iso, "Europe/London")).not.toBe(
      formatKickoffLocal(iso, "Asia/Tokyo"),
    );
  });

  it("labels a timezone without throwing", () => {
    expect(formatTimezoneLabel("Europe/London")).toMatch(/London/i);
  });
});
