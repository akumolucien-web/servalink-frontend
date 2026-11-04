import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Check, MapPin, Tag } from "lucide-react";
import { api, ApiError, type Booking, type BookingAction } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { formatBookingDate, formatDateTime } from "../../lib/format";
import { BOOKING_STATUS } from "../../lib/status";
import { buildTimeline } from "../../lib/timeline";
import { Button, ButtonLink } from "../ui/Button";
import { Avatar, StatusBadge } from "../ui/Display";
import { useConfirm, useToast } from "../ui/Overlay";
import { NoteModal } from "./NoteModal";

export type BookingRole = "citizen" | "provider";

/** Which side of the booking the signed-in user is on. A user can never be both (self-booking is blocked). */
export function useBookingRole(booking: Pick<Booking, "provider_id">): BookingRole {
  const { session } = useAuth();
  return booking.provider_id === session?.sub ? "provider" : "citizen";
}

interface ActionDef {
  label: string;
  done: string;
  variant: "primary" | "secondary" | "danger-outline";
  confirm?: { title: string; message: string; confirmLabel: string; tone?: "danger" };
}

// Backend action names stay exact; button copy follows the product rules ("Mark Finished" sends MARK_COMPLETED).
export const BOOKING_ACTIONS: Record<BookingAction, ActionDef> = {
  ACCEPT: { label: "Accept", done: "Booking accepted", variant: "primary" },
  REJECT: {
    label: "Reject", done: "Booking rejected", variant: "danger-outline",
    confirm: { title: "Reject this request?", message: "The customer will be told you can't take this job. You can't undo this.", confirmLabel: "Reject request", tone: "danger" },
  },
  START_WORK: { label: "Start work", done: "Work started", variant: "primary" },
  MARK_COMPLETED: {
    label: "Mark Finished", done: "Marked as finished", variant: "primary",
    confirm: { title: "Mark this job as finished?", message: "The customer will be asked to confirm that the work is complete.", confirmLabel: "Mark Finished" },
  },
  CONFIRM_COMPLETION: {
    label: "Confirm completion", done: "Completion confirmed", variant: "primary",
    confirm: { title: "Confirm the work is complete?", message: "This closes the booking and lets you leave a review.", confirmLabel: "Confirm completion" },
  },
  CANCEL: {
    label: "Cancel request", done: "Request cancelled", variant: "danger-outline",
    confirm: { title: "Cancel this request?", message: "The provider will be told you no longer need this service.", confirmLabel: "Cancel request", tone: "danger" },
  },
  PROVIDER_CANCEL: { label: "Cancel job", done: "Job cancelled", variant: "danger-outline" },
};

/** The backend demands a reason (5-300 chars) for PROVIDER_CANCEL and for CANCEL once the booking is past PENDING. */
export const needsReason = (booking: Pick<Booking, "status">, action: BookingAction) =>
  action === "PROVIDER_CANCEL" || (action === "CANCEL" && booking.status !== "PENDING");

export function availableActions(booking: Pick<Booking, "status">, role: BookingRole): BookingAction[] {
  if (role === "citizen") {
    if (booking.status === "PENDING" || booking.status === "ACCEPTED") return ["CANCEL"];
    if (booking.status === "AWAITING_CONFIRMATION") return ["CONFIRM_COMPLETION"];
    return [];
  }
  if (booking.status === "PENDING") return ["ACCEPT", "REJECT"];
  if (booking.status === "ACCEPTED") return ["START_WORK", "MARK_COMPLETED", "PROVIDER_CANCEL"];
  if (booking.status === "IN_PROGRESS") return ["MARK_COMPLETED", "PROVIDER_CANCEL"];
  return [];
}

/** Runs a booking action through the API, then refetches. The UI never advances status itself. */
export function BookingActionButtons({ booking, role, onChanged, size = "md" }: {
  booking: Booking; role: BookingRole; onChanged: () => void | Promise<void>; size?: "sm" | "md";
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState<BookingAction | null>(null);
  const [asking, setAsking] = useState<BookingAction | null>(null);
  const actions = availableActions(booking, role);

  const send = async (action: BookingAction, reason?: string) => {
    setBusy(action);
    try {
      await api.bookingAction(booking.booking_id, action, reason);
      toast.success(BOOKING_ACTIONS[action].done);
      setAsking(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "That didn't work. Try again.");
    } finally {
      setBusy(null);
      await onChanged();
    }
  };

  const run = async (action: BookingAction) => {
    if (needsReason(booking, action)) { setAsking(action); return; }
    const def = BOOKING_ACTIONS[action];
    if (def.confirm && !(await confirm(def.confirm))) return;
    await send(action);
  };

  const submitReason = async (note: string) => {
    if (note.length < 5 || note.length > 300) throw new Error("Give a reason of 5 to 300 characters");
    await send(asking!, note); // the modal closes only once the API accepted it, so a rejected reason isn't lost
  };

  if (!actions.length) return null;
  return (
    <>
      {actions.map((action) => (
        <Button key={action} size={size} variant={BOOKING_ACTIONS[action].variant} loading={busy === action}
          disabled={busy !== null} onClick={() => run(action)}>
          {BOOKING_ACTIONS[action].label}
        </Button>
      ))}
      <NoteModal open={asking !== null} tone="danger" title={asking === "PROVIDER_CANCEL" ? "Cancel this job?" : "Cancel this booking?"}
        intro={<p className="muted small">{asking === "PROVIDER_CANCEL" ? "The customer will see your reason." : "The provider will see your reason."}</p>}
        label="Reason (at least 5 characters)" confirmLabel={asking === "PROVIDER_CANCEL" ? "Cancel job" : "Cancel booking"}
        onClose={() => setAsking(null)} onSubmit={submitReason} />
    </>
  );
}

export function BookingCard({ booking, onChanged }: { booking: Booking; onChanged: () => void | Promise<void> }) {
  const role = useBookingRole(booking);
  const status = BOOKING_STATUS[booking.status];
  const counterparty = role === "citizen" ? booking.provider_name : booking.citizen_name;
  return (
    <article className="card card-interactive booking-card" aria-label={`Booking ${booking.reference}`}>
      <div className="top">
        <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
          <Avatar name={counterparty} size={44} />
          <div>
            <div className="row" style={{ gap: 10 }}>
              <Link className="ref" to={`/app/bookings/${booking.booking_id}`} style={{ color: "inherit" }}>{booking.reference}</Link>
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
            <div className="muted small">{role === "citizen" ? "Provider" : "Customer"}: {counterparty || "Unknown"}</div>
          </div>
        </div>
        <div className="muted xs">Requested {formatDateTime(booking.created_at)}</div>
      </div>
      <div className="meta">
        {booking.category_name && <span><Tag size={15} aria-hidden="true" />{booking.category_name}</span>}
        {booking.city && <span><MapPin size={15} aria-hidden="true" />{booking.city}</span>}
        <span><Calendar size={15} aria-hidden="true" />{formatBookingDate(booking.booking_date)}</span>
      </div>
      {booking.message && <p className="msg">{booking.message}</p>}
      <div className="actions">
        <BookingActionButtons booking={booking} role={role} onChanged={onChanged} size="sm" />
        {role === "citizen" && booking.status === "COMPLETED" && !booking.reviewed && (
          <ButtonLink size="sm" variant="secondary" to={`/app/bookings/${booking.booking_id}/review`}>Leave a review</ButtonLink>
        )}
        <ButtonLink size="sm" variant="ghost" to={`/app/bookings/${booking.booking_id}`}>View details</ButtonLink>
      </div>
    </article>
  );
}

export function BookingTimeline({ booking, role }: { booking: Booking; role: BookingRole }) {
  const steps = buildTimeline(booking, role);
  return (
    <ol className="timeline" aria-label="Booking progress" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {steps.map((step) => (
        <li key={step.key} className={`tl-step ${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
          <span className="tl-dot" aria-hidden="true">{(step.state === "done" || step.state === "bad") && <Check size={14} strokeWidth={3} />}</span>
          <div>
            <div className="tl-title">{step.title}</div>
            {step.state !== "upcoming" && <div className="tl-desc">{step.description}</div>}
          </div>
          {step.time && <time className="tl-time" dateTime={step.time}>{formatDateTime(step.time)}</time>}
        </li>
      ))}
    </ol>
  );
}
