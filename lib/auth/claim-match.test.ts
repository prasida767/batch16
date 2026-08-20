import { describe, expect, it } from "vitest";
import {
  namesMatchForClaim,
  normalizeTeamName,
  validateClaimInputs,
} from "@/lib/auth/claim-match";
import { isAdminEmail, getAdminEmails } from "@/lib/auth/admin";

describe("claim matching", () => {
  it("validates required claim fields", () => {
    expect(validateClaimInputs({ fullName: "", teamName: "FC" })).toMatch(
      /name and FPL team/i,
    );
    expect(validateClaimInputs({ fullName: "A", teamName: "" })).toMatch(
      /name and FPL team/i,
    );
    expect(
      validateClaimInputs({ fullName: "Abhishek Gupta", teamName: "Batch United" }),
    ).toBeNull();
  });

  it("matches names by canonical key", () => {
    expect(namesMatchForClaim("Abhishek Gupta", "abhishek gupta")).toBe(true);
    expect(namesMatchForClaim("Abhishek Gupta", "Someone Else")).toBe(false);
  });

  it("normalizes team names for comparison", () => {
    expect(normalizeTeamName("  Batch United!! ")).toBe(
      normalizeTeamName("batch united"),
    );
  });
});

describe("admin allowlist", () => {
  it("denies when ADMIN_EMAILS is empty", () => {
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "";
    expect(getAdminEmails()).toEqual([]);
    expect(isAdminEmail("anyone@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = prev;
  });

  it("matches allowlisted emails case-insensitively", () => {
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "Admin@Example.com, other@test.com";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("nope@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = prev;
  });
});
