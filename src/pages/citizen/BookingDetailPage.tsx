import { Link, useParams } from "react-router-dom";
import { Calendar, CalendarX2, Flag, MapPin, MessageSquareText, MessageCircle, Phone, Tag } from "lucide-react";
import { api, ApiError } from "../../api";
import { BookingActionButtons, BookingTimeline, useBookingRole } from "../../components/domain/Booking";
import { BackLink } from "../../components/domain/Provider";
import { ButtonLink } from "../../components/ui/Button";
import { Avatar, CardSkeleton, EmptyState, ErrorState, StatusBadge } from "../../components/ui/Display";
import { formatBookingDate, formatDateTime } from "../../lib/format";
import { formatCmPhone, telUrl, whatsappUrl } from "../../lib/phone";
import { BOOKING_STATUS } from "../../lib/status";
import { useResource } from "../../lib/useResource";
import type { Booking } from "../../api";

/** Shared by customers and providers: the viewer's side of the booking decides copy and actions. */
export function BookingDetailPage() {
  const { id = "" } = useParams();
  const booking = useResource(() => api.booking(id), [id]);
  if (booking.loading && !booking.data) return <CardSkeleton rows={3} />;
  if (booking.error) {
    const missing = booking.error instanceof ApiError && (booking.error.status === 404 || booking.error.status === 403);
    return missing ? (
      <div className="card"><EmptyState icon={<CalendarX2 size={24} />} title="We can't find that booking"
        action={<ButtonLink to="/app/bookings" variant="secondary">Back to my bookings</ButtonLink>}>
        It may not exist, or it isn't one of your bookings.
      </EmptyState></div>
    ) : <ErrorState error={booking.error} onRetry={booking.reload} />;
  }
  return <Detail booking={booking.data!} reload={booking.reload} />;
}

function Detail({ booking, reload }: { booking: Booking; reload: () => Promise<void> }) {
  const role = useBookingRole(booking);
  const status = BOOKING_STATUS[booking.status];
  // The booking record has no service name; fetch it when the service is still listed.
  const service = useResource(() => api.service(booking.service_id).catch(() => null), [booking.service_id]);
  const backTo = role === "provider" ? "/app/provider/bookings" : "/app/bookings";

  return (
    <>
      <BackLink to={backTo}>{role === "provider" ? "Back to booking requests" : "Back to my bookings"}</BackLink>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 12 }}>
            <h1>Booking {booking.reference}</h1>
            <StatusBadge label={status.label} tone={status.tone} />
          </div>
          <p>{formatBookingDate(booking.booking_date)}{booking.city ? ` · ${booking.city}` : ""}</p>
        </div>
        <div className="row">
          <BookingActionButtons booking={booking} role={role} onChanged={reload} />
          {role === "citizen" && booking.status === "COMPLETED" && !booking.reviewed && (
            <ButtonLink to={`/app/bookings/${booking.booking_id}/review`} icon={<MessageSquareText size={16} />}>Leave a review</ButtonLink>
          )}
        </div>
      </div>

      <div className="two-col">
        <section className="card card-pad stack" aria-label="Progress">
          <h2 style={{ fontSize: "1.0625rem" }}>Progress</h2>
          <BookingTimeline booking={booking} role={role} />
          {role === "citizen" && booking.status === "AWAITING_CONFIRMATION" && (
            <p className="hint-box">The provider says the work is finished. Confirm it once you're satisfied. If something is wrong, you can report a problem.</p>
          )}
          {role === "citizen" && booking.status === "COMPLETED" && booking.reviewed && <p className="hint-box">Thanks, your review for this booking is published.</p>}
        </section>

        <aside className="stack">
          <section className="card card-pad stack-sm" aria-label="Service details">
            <h3 style={{ fontSize: "1rem" }}>Service details</h3>
            <p style={{ fontWeight: 600 }}>{service.data?.name ?? booking.category_name ?? "Service"}</p>
            <div className="meta" style={{ flexDirection: "column", gap: 6 }}>
              {booking.category_name && <span><Tag size={15} aria-hidden="true" />{booking.category_name}</span>}
              {booking.city && <span><MapPin size={15} aria-hidden="true" />{booking.city}</span>}
              <span><Calendar size={15} aria-hidden="true" />{formatBookingDate(booking.booking_date)}</span>
            </div>
            <hr className="divider" />
            <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
              <Avatar name={role === "citizen" ? booking.provider_name : booking.citizen_name} size={44} />
              <div>
                <div className="muted xs">{role === "citizen" ? "Provider" : "Customer"}</div>
                <div style={{ fontWeight: 600 }}>{(role === "citizen" ? booking.provider_name : booking.citizen_name) || "Unknown"}</div>
                {role === "citizen" && <Link className="small" to={`/providers/${booking.provider_id}`}>View provider</Link>}
              </div>
            </div>
          </section>
          {booking.counterparty_phone && (
            <section className="card card-pad stack-sm" aria-label="Contact">
              <h3 style={{ fontSize: "1rem" }}>Contact {role === "citizen" ? "the provider" : "the customer"}</h3>
              <p style={{ fontWeight: 600 }}>{formatCmPhone(booking.counterparty_phone)}</p>
              <div className="row">
                <a className="btn btn-primary" href={telUrl(booking.counterparty_phone)}><Phone size={16} aria-hidden="true" />Call</a>
                <a className="btn btn-secondary" target="_blank" rel="noopener noreferrer"
                  href={whatsappUrl(booking.counterparty_phone, `Hello, about ServaLink booking ${booking.reference}`)}>
                  <MessageCircle size={16} aria-hidden="true" />WhatsApp
                </a>
              </div>
            </section>
          )}
          {booking.address_details && (
            <section className="card card-pad stack-sm" aria-label="Address">
              <h3 style={{ fontSize: "1rem" }}>{role === "provider" ? "Where to go" : "Your address"}</h3>
              {booking.quartier && <p style={{ fontWeight: 600 }}>{booking.quartier}</p>}
              <p style={{ whiteSpace: "pre-line" }}>{booking.address_details}</p>
            </section>
          )}
          <section className="card card-pad stack-sm" aria-label="Message">
            <h3 style={{ fontSize: "1rem" }}>Message</h3>
            <p style={{ whiteSpace: "pre-line" }} className={booking.message ? "" : "muted"}>{booking.message || "No message was added."}</p>
          </section>
          <section className="card card-pad stack-sm" aria-label="Booking reference">
            <h3 style={{ fontSize: "1rem" }}>Booking reference</h3>
            <p style={{ fontWeight: 600 }}>{booking.reference}</p>
            <p className="muted xs">Requested {formatDateTime(booking.created_at)}</p>
            {role === "citizen" && (booking.report_id
              ? <p className="small row" style={{ gap: 6 }}><Flag size={14} aria-hidden="true" />You reported this booking. <Link to="/app/reports">View reports</Link></p>
              : <ButtonLink variant="ghost" size="sm" to={`/app/bookings/${booking.booking_id}/report`} icon={<Flag size={14} />}>Report a problem</ButtonLink>)}
          </section>
        </aside>
      </div>
    </>
  );
}
