import { Link } from "react-router-dom";
import { CalendarCheck, CheckCircle2, ClipboardList, Flag, MessageSquareText, Search } from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { ButtonLink } from "../../components/ui/Button";
import { Avatar, Banner, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from "../../components/ui/Display";
import { useLang, useT } from "../../i18n/I18nProvider";
import { formatDateTime, greetingTitle } from "../../lib/format";
import { ACTIVE_BOOKING, BOOKING_STATUS, PROVIDER_STATUS } from "../../lib/status";
import { useResource } from "../../lib/useResource";

export function DashboardPage() {
  const { profile, provider, needsSessionRefresh, hasProviderTools } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const bookings = useResource(() => api.bookings("citizen"), []);
  const reviews = useResource(() => api.myReviews(), []);
  const reports = useResource(() => api.myReports(), []);

  const list = bookings.data ?? [];
  const active = bookings.data ? list.filter((b) => ACTIVE_BOOKING.includes(b.status)).length : undefined;
  const completed = bookings.data ? list.filter((b) => b.status === "COMPLETED").length : undefined;
  const count = (value: number | undefined, loading: boolean) => (loading && value === undefined ? <Skeleton width={36} height={30} /> : value ?? 0);
  const waiting = list.filter((b) => b.status === "AWAITING_CONFIRMATION");
  const toReview = list.filter((b) => b.status === "COMPLETED" && !b.reviewed);

  return (
    <div className="stack-lg">
      <PageHeader title={greetingTitle(profile?.full_name, lang)} subtitle={t("dash.sub")} />

      {needsSessionRefresh && (
        <Banner tone="success" action={<ButtonLink to="/app/provider" size="sm">{t("dash.unlock")}</ButtonLink>}>
          <strong>{t("dash.approved")}</strong>
          <span>{t("dash.approvedText")}</span>
        </Banner>
      )}
      {provider?.status === "PENDING" && (
        <Banner tone="info" action={<ButtonLink to="/app/become-provider" size="sm" variant="secondary">{t("dash.viewStatus")}</ButtonLink>}>
          <strong>{t("dash.pending")}</strong>
          <span>{t("dash.pendingText")}</span>
        </Banner>
      )}
      {provider && ["SUSPENDED", "BANNED", "REJECTED"].includes(provider.status) && (
        <Banner tone="warning" action={<ButtonLink to="/app/become-provider" size="sm" variant="secondary">{t("bk.viewDetails")}</ButtonLink>}>
          <strong>{t("dash.providerStatus", { status: t(PROVIDER_STATUS[provider.status].label) })}</strong>
          <span>{t("dash.noTools")}</span>
        </Banner>
      )}

      <div className="stat-grid">
        <StatCard to="/app/bookings" label={t("dash.statActive")} icon={<CalendarCheck size={22} />} value={count(active, bookings.loading)} />
        <StatCard to="/app/bookings" label={t("bks.completed")} tone="green" icon={<CheckCircle2 size={22} />} value={count(completed, bookings.loading)} />
        <StatCard to="/app/reviews" label={t("dash.statReviews")} tone="amber" icon={<MessageSquareText size={22} />} value={count(reviews.data?.length, reviews.loading)} />
        <StatCard to="/app/reports" label={t("dash.statReports")} tone="red" icon={<Flag size={22} />} value={count(reports.data?.length, reports.loading)} />
      </div>

      <div className="two-col">
        <div className="stack-lg">
          {(waiting.length > 0 || toReview.length > 0) && (
            <section className="card" aria-label={t("dash.waiting")}>
              <div className="card-head"><h3>{t("dash.waiting")}</h3></div>
              {waiting.map((b) => (
                <div className="service-row" key={b.booking_id}>
                  <div><strong>{t("attn.confirm")}</strong><p className="muted small">{b.provider_name} · {b.reference}</p></div>
                  <ButtonLink size="sm" to={`/app/bookings/${b.booking_id}`}>{t("dash.reviewConfirm")}</ButtonLink>
                </div>
              ))}
              {toReview.map((b) => (
                <div className="service-row" key={b.booking_id}>
                  <div><strong>{t("bk.leaveReview")}</strong><p className="muted small">{b.provider_name} · {b.reference}</p></div>
                  <ButtonLink size="sm" variant="secondary" to={`/app/bookings/${b.booking_id}/review`}>{t("dash.writeReview")}</ButtonLink>
                </div>
              ))}
            </section>
          )}
          <section className="card" aria-label={t("dash.activity")}>
            <div className="card-head">
              <h3>{t("dash.activity")}</h3>
              {list.length > 0 && <Link className="small" to="/app/bookings">{t("dash.viewAllBookings")}</Link>}
            </div>
            {bookings.loading && !bookings.data ? (
              <div className="card-body stack-sm"><Skeleton height={44} /><Skeleton height={44} /></div>
            ) : list.length === 0 ? (
              <EmptyState icon={<ClipboardList size={24} />} title={t("dash.nothing")}
                action={<ButtonLink to="/search" icon={<Search size={16} />}>{t("nav.findService")}</ButtonLink>}>
                {t("dash.nothingText")}
              </EmptyState>
            ) : list.slice(0, 5).map((b) => (
              <Link key={b.booking_id} to={`/app/bookings/${b.booking_id}`} className="service-row" style={{ color: "inherit" }}>
                <span className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
                  <Avatar name={b.provider_name} size={40} />
                  <span><strong>{b.provider_name}</strong><br /><span className="muted small">{b.category_name} · {formatDateTime(b.created_at)}</span></span>
                </span>
                <StatusBadge label={t(BOOKING_STATUS[b.status].label)} tone={BOOKING_STATUS[b.status].tone} />
              </Link>
            ))}
          </section>
        </div>

        <aside className="stack">
          <div className="cta-card">
            <Search size={28} aria-hidden="true" />
            <h2 style={{ fontSize: "1.25rem" }}>{t("nav.findService")}</h2>
            <p>{t("dash.findText")}</p>
            <ButtonLink to="/search" variant="light" icon={<Search size={16} />}>{t("dash.search")}</ButtonLink>
          </div>
          {!provider && !hasProviderTools && (
            <div className="card card-pad stack-sm">
              <h3 style={{ fontSize: "1rem" }}>{t("dash.offer")}</h3>
              <p className="muted small">{t("dash.offerText")}</p>
              <ButtonLink to="/app/become-provider" variant="secondary" size="sm">{t("bp.title")}</ButtonLink>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
