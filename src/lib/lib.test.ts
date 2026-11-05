import { afterEach, describe, expect, it } from "vitest";
import { categoryLabel, formatBookingDate, formatFcfa, greeting, initials, nextHourLocal } from "./format";
import { applyLang } from "../i18n/core";
import { BOOKING_STATUS, RATING_LABEL, ratingRank, reportReasonLabel, statusOf } from "./status";
import { translate } from "../i18n/core";
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

describe("French", () => {
  afterEach(() => applyLang("en"));

  it("formatFcfa says Sur devis when there is no price", () => {
    applyLang("fr");
    expect(formatFcfa(null)).toBe("Sur devis");
    expect(formatFcfa(5000)).toBe("5 000 FCFA");
  });

  it("explains a cancelled booking in French", () => {
    const cancelled = { ...base, status: "CANCELLED" as const, cancelled_by: "PROVIDER" as const, cancel_reason: "Panne de camion" };
    const steps = buildTimeline(cancelled, "citizen", "fr");
    expect(steps.map((s) => s.title)).toEqual(["Demande envoyée", "Annulée"]);
    expect(steps[1].description).toBe("Le prestataire a annulé : Panne de camion");
    expect(buildTimeline({ ...cancelled, cancel_reason: undefined }, "provider", "fr")[1].description).toBe("Vous avez annulé : aucune raison indiquée");
    expect(buildTimeline(cancelled, "citizen", "en")[1].description).toBe("The provider cancelled: Panne de camion");
  });

  it("booking statuses and greetings follow the language", () => {
    const label = (lang: "fr" | "en") => (["PENDING", "ACCEPTED", "IN_PROGRESS", "AWAITING_CONFIRMATION", "COMPLETED", "REJECTED", "CANCELLED"] as const)
      .map((s) => translate(lang, BOOKING_STATUS[s].label));
    expect(label("fr")).toEqual(["En attente", "Acceptée", "En cours", "En attente de confirmation", "Terminée", "Refusée", "Annulée"]);
    expect(label("en")[3]).toBe("Awaiting confirmation");
    expect(greeting(new Date(2026, 0, 1, 9), "fr")).toBe("Bonjour");
    expect(greeting(new Date(2026, 0, 1, 20), "fr")).toBe("Bonsoir");
    expect(greeting(new Date(2026, 0, 1, 9), "en")).toBe("Good morning");
  });

  it("an unknown status falls back to Unknown instead of crashing", () => {
    expect(statusOf(BOOKING_STATUS, "PENDING")).toBe(BOOKING_STATUS.PENDING);
    for (const odd of ["ARCHIVED", "", undefined, null, "constructor"]) {
      expect(statusOf(BOOKING_STATUS, odd)).toEqual({ label: "common.unknown", tone: "slate" });
    }
    expect(translate("fr", "common.unknown")).toBe("Inconnu");
  });

  it("report reasons are stored in English and shown in the active language", () => {
    expect(reportReasonLabel("Safety concern", "fr")).toBe("Problème de sécurité");
    expect(reportReasonLabel("Safety concern", "en")).toBe("Safety concern");
    expect(reportReasonLabel("Free text from an older report", "fr")).toBe("Free text from an older report");
  });

  it("categoryLabel uses the French name only in French and only when present", () => {
    const c = { category_name: "Plumbing", category_name_fr: "Plomberie" };
    expect(categoryLabel(c, "fr")).toBe("Plomberie");
    expect(categoryLabel(c, "en")).toBe("Plumbing");
    expect(categoryLabel({ category_name: "Plumbing" }, "fr")).toBe("Plumbing");
    expect(categoryLabel({ category_name: "Plumbing", category_name_fr: " " }, "fr")).toBe("Plumbing");
  });
});
