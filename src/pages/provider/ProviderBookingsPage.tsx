import { useState } from "react";
import { Inbox } from "lucide-react";
import { api, type Booking } from "../../api";
import { BookingCard } from "../../components/domain/Booking";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { Tabs } from "../../components/ui/Tabs";
import { useT, type Key } from "../../i18n/I18nProvider";
import { CLOSED_BOOKING } from "../../lib/status";
import { useResource } from "../../lib/useResource";

type Tab = "requests" | "active" | "awaiting" | "completed" | "closed";
const FILTERS: Record<Tab, (b: Booking) => boolean> = {
  requests: (b) => b.status === "PENDING",
  active: (b) => b.status === "ACCEPTED" || b.status === "IN_PROGRESS",
  awaiting: (b) => b.status === "AWAITING_CONFIRMATION",
  completed: (b) => b.status === "COMPLETED",
  closed: (b) => CLOSED_BOOKING.includes(b.status),
};
const EMPTY: Record<Tab, Key> = {
  requests: "pb.empty.requests",
  active: "pb.empty.active",
  awaiting: "pb.empty.awaiting",
  completed: "pb.empty.completed",
  closed: "pb.empty.closed",
};

/** Provider view of bookings: requests customers sent to my provider profile. */
export function ProviderBookingsPage() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("requests");
  const bookings = useResource(() => api.bookings("provider"), []);
  const all = bookings.data ?? [];
  const count = (which: Tab) => (bookings.data ? all.filter(FILTERS[which]).length : undefined);
  const shown = all.filter(FILTERS[tab]);

  return (
    <>
      <PageHeader title={t("pb.title")} subtitle={t("pb.sub")} />
      <div className="stack">
        <Tabs label={t("pb.filter")} value={tab} onChange={setTab} tabs={[
          { id: "requests", label: t("pb.new"), count: count("requests") }, { id: "active", label: t("bks.active"), count: count("active") },
          { id: "awaiting", label: t("status.booking.AWAITING_CONFIRMATION"), count: count("awaiting") }, { id: "completed", label: t("bks.completed"), count: count("completed") },
          { id: "closed", label: t("pb.closed"), count: count("closed") },
        ]} />
        {bookings.loading && !bookings.data ? <CardSkeleton rows={3} />
          : bookings.error ? <ErrorState error={bookings.error} onRetry={bookings.reload} title={t("pb.error")} />
            : shown.length === 0 ? <div className="card"><EmptyState icon={<Inbox size={24} />} title={t("pb.nothing")}>{t(EMPTY[tab])}</EmptyState></div>
              : <div className="stack">{shown.map((b) => <BookingCard key={b.booking_id} booking={b} onChanged={bookings.reload} />)}</div>}
      </div>
    </>
  );
}
