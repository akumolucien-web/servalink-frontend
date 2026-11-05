import { getLang, translate, type Key, type Lang, type Vars } from "../i18n/core";
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
 * REJECTED / CANCELLED are terminal and show no future steps. Copy follows `lang` (default: the active language).
 */
function cancelCopy({ cancelled_by: by, cancel_reason: reason }: Pick<Booking, "cancelled_by" | "cancel_reason">, role: "citizen" | "provider", lang: Lang) {
  const t = (key: Key, vars?: Vars) => translate(lang, key, vars);
  const why = reason || t("tl.noReason");
  if (by === "PROVIDER") return role === "citizen" ? t("tl.cancel.providerToCitizen", { reason: why }) : t("tl.cancel.providerToProvider", { reason: why });
  if (by === "CITIZEN") return role === "citizen" ? t("tl.cancel.citizenToCitizen") : t("tl.cancel.citizenToProvider", { reason: why });
  return role === "citizen" ? t("tl.cancel.legacyCitizen") : t("tl.cancel.legacyProvider");
}

export function buildTimeline(
  booking: Pick<Booking, "status" | "created_at" | "updated_at" | "cancelled_by" | "cancel_reason">,
  role: "citizen" | "provider",
  lang: Lang = getLang(),
): TimelineStep[] {
  const t = (key: Key) => translate(lang, key);
  const citizen = role === "citizen";
  const first: TimelineStep = {
    key: "PENDING",
    title: t(citizen ? "tl.sent" : "tl.received"),
    description: t(citizen ? "tl.sent.text" : "tl.received.text"),
    state: "done",
    time: booking.created_at,
  };
  const { status } = booking;
  if (status === "REJECTED" || status === "CANCELLED") {
    const rejected = status === "REJECTED";
    return [first, {
      key: status,
      title: t(rejected ? "status.booking.REJECTED" : "status.booking.CANCELLED"),
      description: rejected ? t(citizen ? "tl.rejected.citizen" : "tl.rejected.provider") : cancelCopy(booking, role, lang),
      state: "bad",
      time: booking.updated_at,
    }];
  }
  const index = NORMAL.indexOf(status);
  const copy: Record<string, [string, string]> = {
    ACCEPTED: [t("status.booking.ACCEPTED"), t(citizen ? "tl.accepted.citizen" : "tl.accepted.provider")],
    IN_PROGRESS: [t("status.booking.IN_PROGRESS"), t(citizen ? "tl.progress.citizen" : "tl.progress.provider")],
    AWAITING_CONFIRMATION: [t("status.booking.AWAITING_CONFIRMATION"), t(citizen ? "tl.awaiting.citizen" : "tl.awaiting.provider")],
    COMPLETED: [t("status.booking.COMPLETED"), t(citizen ? "tl.completed.citizen" : "tl.completed.provider")],
  };
  const steps = NORMAL.slice(1).map((key, i): TimelineStep => {
    const position = i + 1;
    const state: StepState = position < index ? "done" : position === index ? (status === "COMPLETED" ? "done" : "current") : "upcoming";
    return { key, title: copy[key][0], description: copy[key][1], state, time: position === index ? booking.updated_at : undefined };
  });
  if (index === 0) first.state = "current";
  return [first, ...steps];
}
