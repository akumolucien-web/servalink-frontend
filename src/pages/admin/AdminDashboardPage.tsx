import { Link } from "react-router-dom";
import { Flag, Hourglass, ShieldAlert, Tags } from "lucide-react";
import { api } from "../../api";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge } from "../../components/ui/Display";
import { ButtonLink } from "../../components/ui/Button";
import { useT } from "../../i18n/I18nProvider";
import { formatDate } from "../../lib/format";
import { PROVIDER_STATUS } from "../../lib/status";
import { useResource } from "../../lib/useResource";

export function AdminDashboardPage() {
  const t = useT();
  const providers = useResource(() => api.adminProviders(), []);
  const reports = useResource(() => api.adminReports(), []);
  const requests = useResource(() => api.adminCategoryRequests(), []);
  const pending = (providers.data ?? []).filter((p) => p.status === "PENDING");
  const suspended = (providers.data ?? []).filter((p) => p.status === "SUSPENDED").length;
  const pendingRequests = (requests.data ?? []).filter((r) => r.status === "PENDING").length;
  const num = (loading: boolean, data: unknown, value: number) => (loading && !data ? <Skeleton width={36} height={30} /> : value);

  return (
    <div className="stack-lg">
      <PageHeader title={t("ad.title")} subtitle={t("ad.sub")} />
      <div className="stat-grid">
        <StatCard to="/admin/providers" label={t("ad.statPending")} tone="amber" icon={<Hourglass size={22} />} value={num(providers.loading, providers.data, pending.length)} />
        <StatCard to="/admin/providers" label={t("ad.statSuspended")} tone="red" icon={<ShieldAlert size={22} />} value={num(providers.loading, providers.data, suspended)} />
        <StatCard to="/admin/reports" label={t("ad.statReports")} tone="blue" icon={<Flag size={22} />} value={num(reports.loading, reports.data, reports.data?.length ?? 0)} />
        <StatCard to="/admin/categories" label={t("ad.statRequests")} tone="purple" icon={<Tags size={22} />} value={num(requests.loading, requests.data, pendingRequests)} />
      </div>
      <section className="card" aria-label={t("ad.recent")}>
        <div className="card-head"><h3>{t("ad.applications")}</h3><Link className="small" to="/admin/providers">{t("common.viewAll")}</Link></div>
        {providers.loading && !providers.data ? <div className="card-body"><Skeleton height={44} /></div>
          : providers.error ? <ErrorState error={providers.error} onRetry={providers.reload} />
            : pending.length === 0 ? <EmptyState icon={<Hourglass size={24} />} title={t("ad.noPending")}>{t("ad.noPendingText")}</EmptyState>
              : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>{t("f.name")}</th><th>{t("f.category")}</th><th>{t("f.town")}</th><th>{t("f.submitted")}</th><th>{t("f.status")}</th><th><span className="sr-only">{t("f.actions")}</span></th></tr></thead>
                    <tbody>
                      {pending.slice(0, 6).map((p) => (
                        <tr key={p.provider_id}>
                          <td><div className="row" style={{ gap: 10, flexWrap: "nowrap" }}><Avatar name={p.name} size={32} /><span>{p.name}</span></div></td>
                          <td>{p.service_category}</td><td>{p.city}</td><td className="nowrap">{formatDate(p.created_at)}</td>
                          <td><StatusBadge label={t(PROVIDER_STATUS[p.status].label)} tone={PROVIDER_STATUS[p.status].tone} /></td>
                          <td><ButtonLink size="sm" to="/admin/providers">{t("ad.review")}</ButtonLink></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </section>
    </div>
  );
}
