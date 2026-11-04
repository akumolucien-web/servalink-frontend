import { describe, expect, it } from "vitest";
import type { Booking, BookingStatus } from "../../api";
import { buildTimeline } from "../../lib/timeline";
import { availableActions, needsReason } from "./Booking";

const b = (status: BookingStatus, extra: Partial<Booking> = {}) =>
  ({ status, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", ...extra }) as Booking;

describe("availableActions", () => {
  const citizen: Record<BookingStatus, string[]> = {
    PENDING: ["CANCEL"], ACCEPTED: ["CANCEL"], IN_PROGRESS: [], AWAITING_CONFIRMATION: ["CONFIRM_COMPLETION"],
    COMPLETED: [], REJECTED: [], CANCELLED: [],
  };
  const provider: Record<BookingStatus, string[]> = {
    PENDING: ["ACCEPT", "REJECT"], ACCEPTED: ["START_WORK", "MARK_COMPLETED", "PROVIDER_CANCEL"],
    IN_PROGRESS: ["MARK_COMPLETED", "PROVIDER_CANCEL"], AWAITING_CONFIRMATION: [], COMPLETED: [], REJECTED: [], CANCELLED: [],
  };
  it.each(Object.entries(citizen))("citizen %s", (s, want) => expect(availableActions(b(s as BookingStatus), "citizen")).toEqual(want));
  it.each(Object.entries(provider))("provider %s", (s, want) => expect(availableActions(b(s as BookingStatus), "provider")).toEqual(want));
});

describe("needsReason", () => {
  it("CANCEL only needs a reason after the booking left PENDING", () => {
    expect(needsReason(b("PENDING"), "CANCEL")).toBe(false);
    expect(needsReason(b("ACCEPTED"), "CANCEL")).toBe(true);
    expect(needsReason(b("ACCEPTED"), "PROVIDER_CANCEL")).toBe(true);
    expect(needsReason(b("ACCEPTED"), "ACCEPT")).toBe(false);
  });
});

describe("cancelled timeline", () => {
  const last = (booking: Booking, role: "citizen" | "provider") => buildTimeline(booking, role).at(-1)!.description;
  const byProvider = b("CANCELLED", { cancelled_by: "PROVIDER", cancel_reason: "Truck broke down" });
  const byCitizen = b("CANCELLED", { cancelled_by: "CITIZEN", cancel_reason: "Found someone else" });
  it("provider cancel", () => {
    expect(last(byProvider, "citizen")).toBe("The provider cancelled: Truck broke down");
    expect(last(byProvider, "provider")).toBe("You cancelled: Truck broke down");
  });
  it("citizen cancel", () => {
    expect(last(byCitizen, "citizen")).toBe("You cancelled this booking.");
    expect(last(byCitizen, "provider")).toBe("The customer cancelled: Found someone else");
    expect(last(b("CANCELLED", { cancelled_by: "CITIZEN" }), "provider")).toBe("The customer cancelled: no reason given");
  });
  it("legacy copy without cancelled_by", () => {
    expect(last(b("CANCELLED"), "citizen")).toBe("You cancelled this request.");
  });
});
