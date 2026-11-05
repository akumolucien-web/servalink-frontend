import { Link, useParams } from "react-router-dom";
import { Calendar, CalendarX2, Flag, MapPin, MessageSquareText, MessageCircle, Phone, Tag } from "lucide-react";
import { api, ApiError } from "../../api";
import { BookingActionButtons, BookingTimeline, useBookingRole } from "../../components/domain/Booking";
import { BackLink } from "../../components/domain/Provider";
import { ButtonLink } from "../../components/ui/Button";
import { Avatar, CardSkeleton, EmptyState, ErrorState, StatusBadge } from "../../components/ui/Display";
import { useT } from "../../i18n/I18nProvider";
import { formatBookingDate, formatDateTime } from "../../lib/format";
import { formatCmPhone, telUrl, whatsappUrl } from "../../lib/phone";
import { BOOKING_STATUS, statusOf } from "../../lib/status";
import { useResource } from "../../lib/useResource";
import type { Booking } from "../../api";

/** Shared by customers and providers: the viewer's side of the booking decides copy and actions. */
export function BookingDetailPage() {
  const { id = "" } = useParams();
  const t = useT();
  const booking = useResource(() => api.booking(id), [id]);
  if (booking.loading && !booking.data) return <CardSkeleton rows={3} />;
  if (booking.error) {
    const missing = booking.error instanceof ApiError && (booking.error.status === 404 || booking.error.status === 403);
    return missing ? (
      <div className="card"><EmptyState icon={<CalendarX2 size={24} />} title={t("bd.notFoundTitle")}
        action={<ButtonLink to="/app/bookings" variant="secondary">{t("bd.backToMine")}</ButtonLink>}>
        {t("bd.notFoundText")}
      </EmptyState></div>
    ) : <ErrorState error={booking.error} onRetry={booking.reload} />;
  }
  return <Detail booking={booking.data!} reload={booking.reload} />;
}

function Detail({ booking, reload }: { booking: Booking; reload: () => Promise<void> }) {
  const t = useT();
  const role = useBookingRole(booking);
  const status = statusOf(BOOKING_STATUS, booking.status);
  // The booking record has no service name; fetch it when the service is still listed.
  const service = useResource(() => api.service(booking.service_id).catch(() => null), [booking.service_id]);
  const backTo = role === "provider" ? "/app/provider/bookings" : "/app/bookings";

  return (
    <>
      <BackLink to={backTo}>{t(role === "provider" ? "bd.backToRequests" : "bd.backToMine")}</BackLink>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 12 }}>
            <h1>{t("bd.title", { ref: booking.reference })}</h1>
            <StatusBadge label={t(status.label)} tone={status.tone} />
          </div>
          <p>{formatBookingDate(booking.booking_date)}{booking.city ? ` · ${booking.city}` : ""}</p>
        </div>
        <div className="row">
          <BookingActionButtons booking={booking} role={role} onChanged={reload} />
          {role === "citizen" && booking.status === "COMPLETED" && !booking.reviewed && (
            <ButtonLink to={`/app/bookings/${booking.booking_id}/review`} icon={<MessageSquareText size={16} />}>{t("bk.leaveReview")}</ButtonLink>
          )}
        </div>
      </div>

      <div className="two-col">
        <section className="card card-pad stack" aria-label={t("bd.progress")}>
          <h2 style={{ fontSize: "1.0625rem" }}>{t("bd.progress")}</h2>
          <BookingTimeline booking={booking} role={role} />
          {role === "citizen" && booking.status === "AWAITING_CONFIRMATION" && (
            <p className="hint-box">{t("bd.hintAwaiting")}</p>
          )}
          {role === "citizen" && booking.status === "COMPLETED" && booking.reviewed && <p className="hint-box">{t("bd.thanks")}</p>}
        </section>

        <aside className="stack">
          <section className="card card-pad stack-sm" aria-label={t("bd.serviceDetails")}>
            <h3 style={{ fontSize: "1rem" }}>{t("bd.serviceDetails")}</h3>
            <p style={{ fontWeight: 600 }}>{service.data?.name ?? booking.category_name ?? t("bd.service")}</p>
            <div className="meta" style={{ flexDirection: "column", gap: 6 }}>
              {booking.category_name && <span><Tag size={15} aria-hidden="true" />{booking.category_name}</span>}
              {booking.city && <span><MapPin size={15} aria-hidden="true" />{booking.city}</span>}
              <span><Calendar size={15} aria-hidden="true" />{formatBookingDate(booking.booking_date)}</span>
            </div>
            <hr className="divider" />
            <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
              <Avatar name={role === "citizen" ? booking.provider_name : booking.citizen_name} size={44} />
              <div>
                <div className="muted xs">{t(role === "citizen" ? "f.provider" : "f.customer")}</div>
                <div style={{ fontWeight: 600 }}>{(role === "citizen" ? booking.provider_name : booking.citizen_name) || t("common.unknown")}</div>
                {role === "citizen" && <Link className="small" to={`/providers/${booking.provider_id}`}>{t("bd.viewProvider")}</Link>}
              </div>
            </div>
          </section>
          {booking.counterparty_phone && (
            <section className="card card-pad stack-sm" aria-label={t("bd.contact")}>
              <h3 style={{ fontSize: "1rem" }}>{t(role === "citizen" ? "bd.contactProvider" : "bd.contactCustomer")}</h3>
              <p style={{ fontWeight: 600 }}>{formatCmPhone(booking.counterparty_phone)}</p>
              <div className="row">
                <a className="btn btn-primary" href={telUrl(booking.counterparty_phone)}><Phone size={16} aria-hidden="true" />{t("bd.call")}</a>
                <a className="btn btn-secondary" target="_blank" rel="noopener noreferrer"
                  href={whatsappUrl(booking.counterparty_phone, t("bd.whatsappMessage", { ref: booking.reference }))}>
                  <MessageCircle size={16} aria-hidden="true" />WhatsApp
                </a>
              </div>
            </section>
          )}
          {!booking.counterparty_phone && ["ACCEPTED", "IN_PROGRESS", "AWAITING_CONFIRMATION", "COMPLETED"].includes(booking.status) && (
            <p className="muted small">{t("bd.noPhone")}</p>
          )}
          {booking.address_details && (
            <section className="card card-pad stack-sm" aria-label={t("bd.address")}>
              <h3 style={{ fontSize: "1rem" }}>{t(role === "provider" ? "bd.whereToGo" : "bd.yourAddress")}</h3>
              {booking.quartier && <p style={{ fontWeight: 600 }}>{booking.quartier}</p>}
              <p style={{ whiteSpace: "pre-line" }}>{booking.address_details}</p>
            </section>
          )}
          <section className="card card-pad stack-sm" aria-label={t("bd.message")}>
            <h3 style={{ fontSize: "1rem" }}>{t("bd.message")}</h3>
            <p style={{ whiteSpace: "pre-line" }} className={booking.message ? "" : "muted"}>{booking.message || t("bd.noMessage")}</p>
          </section>
          <section className="card card-pad stack-sm" aria-label={t("bd.reference")}>
            <h3 style={{ fontSize: "1rem" }}>{t("bd.reference")}</h3>
            <p style={{ fontWeight: 600 }}>{booking.reference}</p>
            <p className="muted xs">{t("bk.requested", { date: formatDateTime(booking.created_at) })}</p>
            {role === "citizen" && (booking.report_id
              ? <p className="small row" style={{ gap: 6 }}><Flag size={14} aria-hidden="true" />{t("bd.reported")} <Link to="/app/reports">{t("bd.viewReports")}</Link></p>
              : <ButtonLink variant="ghost" size="sm" to={`/app/bookings/${booking.booking_id}/report`} icon={<Flag size={14} />}>{t("bd.reportProblem")}</ButtonLink>)}
          </section>
        </aside>
      </div>
    </>
  );
}
