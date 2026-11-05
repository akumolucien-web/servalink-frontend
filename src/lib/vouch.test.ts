import { describe, expect, it } from "vitest";
import { translate } from "../i18n/core";
import { isValidJobMonth, jobMonthBounds } from "./vouch";
import { ratingLabel, RATING_ORDER } from "./status";

const now = new Date(2026, 10, 5); // 5 Nov 2026

describe("job month", () => {
  it("accepts this month and up to 24 months back", () => {
    expect(jobMonthBounds(now)).toEqual({ min: "2024-11", max: "2026-11" });
    for (const ok of ["2026-11", "2026-01", "2025-06", "2024-11"]) expect(isValidJobMonth(ok, now), ok).toBe(true);
  });
  it("rejects the future, older than 24 months and malformed values", () => {
    for (const bad of ["2026-12", "2027-01", "2024-10", "2020-05", "2026-13", "2026-00", "2026-1", "nov 2026", ""]) expect(isValidJobMonth(bad, now), bad).toBe(false);
  });
});

describe("share text", () => {
  it("contains the link and the provider name in both languages", () => {
    const link = "https://servalink.example/vouch/abc_DEF-123";
    for (const lang of ["en", "fr"] as const) {
      const text = translate(lang, "vouch.shareText", { provider: "Awa", link });
      expect(text).toContain(link);
      expect(text).toContain("Awa");
    }
  });
});

describe("rating words", () => {
  it("reuses the review ratings", () => {
    expect(RATING_ORDER.map((r) => ratingLabel(r, "en"))).toEqual(["Bad", "Good", "V.Good", "Excellent"]);
    expect(RATING_ORDER.map((r) => ratingLabel(r, "fr"))).toEqual(["Mauvais", "Bien", "Très bien", "Excellent"]);
  });
});
