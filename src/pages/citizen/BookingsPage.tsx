import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import { api, type Booking } from "../../api";
import { BookingCard } from "../../components/domain/Booking";
import { ButtonLink } from "../../components/ui/Button";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { Tabs } from "../../components/ui/Tabs";
import { useT } from "../../i18n/I18nProvider";
import { ACTIVE_BOOKING, CLOSED_BOOKING } from "../../lib/status";
import { useResource } from "../../lib/useResource";

type Tab = "all" | "active" | "completed" | "closed";
const FILTERS: Record<Tab, (b: Booking) => boolean> = {
  all: () => true,
  active: (b) => ACTIVE_BOOKING.includes(b.status),
  completed: (b) => b.status === "COMPLETED",
  closed: (b) => CLOSED_BOOKING.includes(b.status),
};

export function BookingsPage() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("all");
  const bookings = useResource(() => api.bookings("citizen"), []);
  const all = bookings.data ?? [];
  const shown = all.filter(FILTERS[tab]);
  const count = (which: Tab) => (bookings.data ? all.filter(FILTERS[which]).length : undefined);

  return (
    <>
      <PageHeader title={t("bks.title")} subtitle={t("bks.sub")}
        actions={<ButtonLink to="/search">{t("nav.findService")}</ButtonLink>} />
      <div className="stack">
        <Tabs label={t("bks.filter")} value={tab} onChange={setTab} tabs={[
          { id: "all", label: t("bks.all"), count: count("all") }, { id: "active", label: t("bks.active"), count: count("active") },
          { id: "completed", label: t("bks.completed"), count: count("completed") }, { id: "closed", label: t("bks.closed"), count: count("closed") },
        ]} />
        {bookings.loading && !bookings.data ? <CardSkeleton rows={3} />
          : bookings.error ? <ErrorState error={bookings.error} onRetry={bookings.reload} title={t("bks.error")} />
            : shown.length === 0 ? (
              <div className="card">
                <EmptyState icon={<CalendarX2 size={24} />} title={t(all.length === 0 ? "bks.none" : "bks.noneView")}
                  action={all.length === 0 ? <ButtonLink to="/search">{t("nav.findService")}</ButtonLink> : undefined}>
                  {t(all.length === 0 ? "bks.noneText" : "bks.noneViewText")}
                </EmptyState>
              </div>
            ) : (
              <div className="stack">{shown.map((b) => <BookingCard key={b.booking_id} booking={b} onChanged={bookings.reload} />)}</div>
            )}
      </div>
    </>
  );
}
