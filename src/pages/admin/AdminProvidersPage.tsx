import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { api, type AdminProvider } from "../../api";
import { NoteModal } from "../../components/domain/NoteModal";
import { Button } from "../../components/ui/Button";
import { Avatar, Banner, CardSkeleton, EmptyState, ErrorState, PageHeader, StatusBadge } from "../../components/ui/Display";
import { Modal, useToast } from "../../components/ui/Overlay";
import { Tabs } from "../../components/ui/Tabs";
import { useT } from "../../i18n/I18nProvider";
import { formatDateTime } from "../../lib/format";
import { DECISIONS, type DecisionDef } from "../../lib/providerDecisions";
import { PROVIDER_STATUS, statusOf } from "../../lib/status";
import { useResource } from "../../lib/useResource";

type Tab = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | "BANNED";

export function AdminProvidersPage() {
  const t = useT();
  const toast = useToast();
  const providers = useResource(() => api.adminProviders(), []);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [detail, setDetail] = useState<AdminProvider | null>(null);
  const [decision, setDecision] = useState<{ provider: AdminProvider; def: DecisionDef } | null>(null);

  // Deep link (notification e-mail): /admin/providers/:id opens that application.
  const { id } = useParams();
  const navigate = useNavigate();
  const openedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!id || !providers.data || openedFor.current === id) return;
    openedFor.current = id;
    const found = providers.data.find((p) => p.provider_id === id);
    if (found) { setTab(found.status as Tab); setDetail(found); }
  }, [id, providers.data]);
  const missing = !!id && !!providers.data && !providers.data.some((p) => p.provider_id === id);
  const leaveRoute = () => { if (id) navigate("/admin/providers", { replace: true }); };

  const all = providers.data ?? [];
  const shown = all.filter((p) => p.status === tab);
  const count = (status: Tab) => (providers.data ? all.filter((p) => p.status === status).length : undefined);

  return (
    <>
      <PageHeader title={t("ws.providers")} subtitle={t("ap.sub")} />
      {missing && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="warning" action={<Link className="small nowrap" to="/admin/providers">{t("ap.viewAll")}</Link>}>
            <strong>{t("ap.missing")}</strong>
            <span>{t("ap.missingText")}</span>
          </Banner>
        </div>
      )}
      <div className="stack">
        <Tabs label={t("ap.statusTabs")} value={tab} onChange={setTab} tabs={[
          { id: "PENDING", label: t("status.request.PENDING"), count: count("PENDING") }, { id: "APPROVED", label: t("status.provider.APPROVED"), count: count("APPROVED") },
          { id: "SUSPENDED", label: t("status.provider.SUSPENDED"), count: count("SUSPENDED") }, { id: "REJECTED", label: t("status.provider.REJECTED"), count: count("REJECTED") },
          { id: "BANNED", label: t("status.provider.BANNED"), count: count("BANNED") },
        ]} />
        {providers.loading && !providers.data ? <CardSkeleton rows={2} />
          : providers.error ? <ErrorState error={providers.error} onRetry={providers.reload} title={t("ap.error")} />
            : shown.length === 0 ? <div className="card"><EmptyState icon={<Users size={24} />} title={t("ap.none", { status: t(statusOf(PROVIDER_STATUS, tab).label).toLowerCase() })}>{t("ap.noneText")}</EmptyState></div>
              : (
                <div className="card table-wrap">
                  <table className="table">
                    <thead><tr><th>{t("f.provider")}</th><th>{t("f.category")}</th><th>{t("f.town")}</th><th>{t("f.submitted")}</th><th>{t("f.status")}</th><th><span className="sr-only">{t("f.actions")}</span></th></tr></thead>
                    <tbody>
                      {shown.map((p) => (
                        <tr key={p.provider_id}>
                          <td><div className="row" style={{ gap: 10, flexWrap: "nowrap" }}><Avatar name={p.name} size={36} /><span><strong>{p.name}</strong><br /><span className="muted xs">{p.email}</span></span></div></td>
                          <td>{p.service_category}<br /><span className="muted xs">{p.service_title}</span></td>
                          <td>{p.city}</td><td className="nowrap">{formatDateTime(p.created_at)}</td>
                          <td><StatusBadge label={t(statusOf(PROVIDER_STATUS, p.status).label)} tone={statusOf(PROVIDER_STATUS, p.status).tone} /></td>
                          <td><Button size="sm" variant="secondary" onClick={() => setDetail(p)}>{t((DECISIONS[p.status] ?? []).length ? "ad.review" : "ap.details")}</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </div>

      <Modal wide open={!!detail} title={detail ? t("ap.applicationOf", { name: detail.name }) : ""} onClose={() => { setDetail(null); leaveRoute(); }}
        footer={detail && (DECISIONS[detail.status] ?? []).map((def) => (
          <Button key={def.status} variant={def.variant} onClick={() => { setDecision({ provider: detail, def }); setDetail(null); }}>{t(def.label)}</Button>
        ))}>
        {detail && (
          <div className="modal-body form">
            <dl className="kv">
              <dt>{t("f.status")}</dt><dd><StatusBadge label={t(statusOf(PROVIDER_STATUS, detail.status).label)} tone={statusOf(PROVIDER_STATUS, detail.status).tone} /></dd>
              <dt>{t("f.email")}</dt><dd>{detail.email}</dd><dt>{t("f.phone")}</dt><dd>{detail.phone || t("common.none")}</dd>
              <dt>{t("f.category")}</dt><dd>{detail.service_category}</dd><dt>{t("f.serviceTitle")}</dt><dd>{detail.service_title}</dd>
              <dt>{t("f.description")}</dt><dd style={{ whiteSpace: "pre-line" }}>{detail.description || t("common.none")}</dd>
              <dt>{t("loc.city")}</dt><dd>{detail.city}</dd><dt>{t("f.submitted")}</dt><dd>{formatDateTime(detail.created_at)}</dd>
              {detail.status_reason && <><dt>{t("ap.lastNote")}</dt><dd>{detail.status_reason}</dd></>}
            </dl>
          </div>
        )}
      </Modal>

      <NoteModal open={!!decision} title={decision ? t(decision.def.title, { name: decision.provider.name }) : ""}
        label={decision ? t(decision.def.noteLabel) : ""} confirmLabel={decision ? t(decision.def.label) : ""} tone={decision?.def.tone}
        initialNote={decision?.def.seed ? t(decision.def.seed) : ""}
        intro={decision?.def.status === "APPROVED" ? <p className="muted small">{t("ap.approveIntro")}</p> : undefined}
        onClose={() => { setDecision(null); leaveRoute(); }}
        onSubmit={async (note) => {
          await api.adminSetProviderStatus(decision!.provider.provider_id, decision!.def.status, note);
          toast.success(t(decision!.def.done));
          setDecision(null);
          leaveRoute();
          await providers.reload();
        }} />
    </>
  );
}
