import { describe, expect, it } from "vitest";
import { formatBookingDate, formatFcfa, initials, nextHourLocal } from "./format";
import { RATING_LABEL, ratingRank } from "./status";
import { buildTimeline } from "./timeline";

const base = { created_at: "2026-10-01T09:00:00+00:00", updated_at: "2026-10-02T10:00:00+00:00" };

describe("booking timeline", () => {
  it("marks only the first step current for a pending booking and shows no invented times", () => {
    const steps = buildTimeline({ ...base, status: "PENDING" }, "citizen");
    expect(steps.map((s) => s.state)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(steps.filter((s) => s.time).map((s) => s.time)).toEqual([base.created_at]);
  });

  it("drives progress purely from status", () => {
    const steps = buildTimeline({ ...base, status: "AWAITING_CONFIRMATION" }, "provider");
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "current", "upcoming"]);
    expect(steps[0].title).toBe("Request received");
    expect(steps[3].time).toBe(base.updated_at);
  });

  it("completes every step for a completed booking", () => {
    expect(buildTimeline({ ...base, status: "COMPLETED" }, "citizen").every((s) => s.state === "done")).toBe(true);
  });

  it.each(["REJECTED", "CANCELLED"] as const)("%s is terminal with no future steps", (status) => {
    const steps = buildTimeline({ ...base, status }, "citizen");
    expect(steps).toHaveLength(2);
    expect(steps[1].state).toBe("bad");
  });
});

describe("labels and formatting", () => {
  it("uses rating labels, not stars or numbers", () => {
    expect(RATING_LABEL).toEqual({ BAD: "Bad", GOOD: "Good", VERY_GOOD: "V.Good", EXCELLENT: "Excellent" });
    expect(ratingRank("EXCELLENT")).toBeGreaterThan(ratingRank("GOOD"));
    expect(ratingRank(null)).toBe(0);
  });

  it("formats the opaque booking date without timezone shifts", () => {
    expect(formatBookingDate("2026-10-12T10:00")).toBe("12 Oct 2026, 10:00");
    expect(formatBookingDate("garbage")).toBe("garbage");
  });

  it("builds a datetime-local minimum in the expected shape", () => {
    expect(nextHourLocal(new Date(2026, 9, 7, 20, 15))).toBe("2026-10-07T21:00");
  });

  it("derives initials", () => {
    expect(initials("Marie Kamga")).toBe("MK");
    expect(initials("")).toBe("?");
  });
});

describe("formatFcfa", () => {
  it("groups thousands with a regular space", () => {
    expect(formatFcfa(5000)).toBe("5 000 FCFA");
    expect(formatFcfa(1250000)).toBe("1 250 000 FCFA");
  });

  it("says price on request when there is no price", () => {
    expect(formatFcfa(null)).toBe("Price on request");
    expect(formatFcfa(undefined)).toBe("Price on request");
  });
});
