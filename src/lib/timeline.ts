import type { Booking, BookingStatus } from "../api/types";

export type StepState = "done" | "current" | "upcoming" | "bad";
export interface TimelineStep {
  key: string;
  title: string;
  description: string;
  state: StepState;
  /** Only timestamps the backend really provides (created_at / updated_at). */
  time?: string;
}

const NORMAL: BookingStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "AWAITING_CONFIRMATION", "COMPLETED"];

/**
 * Builds the timeline purely from booking.status. The frontend never advances status.
 * REJECTED / CANCELLED are terminal and show no future steps.
 */
function cancelCopy({ cancelled_by: by, cancel_reason: reason }: Pick<Booking, "cancelled_by" | "cancel_reason">, role: "citizen" | "provider") {
  if (by === "PROVIDER") return role === "citizen" ? `The provider cancelled: ${reason || "no reason given"}` : `You cancelled: ${reason || "no reason given"}`;
  if (by === "CITIZEN") return role === "citizen" ? "You cancelled this booking." : `The customer cancelled: ${reason || "no reason given"}`;
  return role === "citizen" ? "You cancelled this request." : "The customer cancelled this request.";
}

export function buildTimeline(booking: Pick<Booking, "status" | "created_at" | "updated_at" | "cancelled_by" | "cancel_reason">, role: "citizen" | "provider"): TimelineStep[] {
  const first: TimelineStep = {
    key: "PENDING",
    title: role === "citizen" ? "Request sent" : "Request received",
    description: role === "citizen" ? "Your booking request was created." : "A customer asked to book your service.",
    state: "done",
    time: booking.created_at,
  };
  const { status } = booking;
  if (status === "REJECTED" || status === "CANCELLED") {
    const rejected = status === "REJECTED";
    return [first, {
      key: status,
      title: rejected ? "Rejected" : "Cancelled",
      description: rejected
        ? (role === "citizen" ? "The provider declined this request." : "You declined this request.")
        : cancelCopy(booking, role),
      state: "bad",
      time: booking.updated_at,
    }];
  }
  const index = NORMAL.indexOf(status);
  const copy: Record<string, [string, string]> = {
    ACCEPTED: ["Accepted", role === "citizen" ? "The provider accepted your request." : "You accepted this request."],
    IN_PROGRESS: ["In progress", role === "citizen" ? "The provider is working on it." : "You started the work."],
    AWAITING_CONFIRMATION: ["Awaiting confirmation", role === "citizen" ? "The provider says the work is finished. Please confirm." : "Waiting for the customer to confirm."],
    COMPLETED: ["Completed", role === "citizen" ? "You confirmed the work is complete." : "The customer confirmed completion."],
  };
  const steps = NORMAL.slice(1).map((key, i): TimelineStep => {
    const position = i + 1;
    const state: StepState = position < index ? "done" : position === index ? (status === "COMPLETED" ? "done" : "current") : "upcoming";
    return { key, title: copy[key][0], description: copy[key][1], state, time: position === index ? booking.updated_at : undefined };
  });
  if (index === 0) first.state = "current";
  return [first, ...steps];
}
