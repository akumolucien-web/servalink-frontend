import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Flag } from "lucide-react";
import { api, type AdminProvider, type Report } from "../../api";
import { NoteModal } from "../../components/domain/NoteModal";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader, StatusBadge } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Overlay";
import { useLang, useT, type Key } from "../../i18n/I18nProvider";
import { formatDateTime } from "../../lib/format";
import { focusDomId, useFocusTarget } from "../../lib/useFocusTarget";
import { SUSPEND } from "../../lib/providerDecisions";
import { PROVIDER_STATUS, REPORT_STATUS, reportReasonLabel, statusOf } from "../../lib/status";
import { useResource } from "../../lib/useResource";

type Action = "START_REVIEW" | "RESOLVE" | "DISMISS";
const COPY: Record<Action, { label: Key; title: Key; note: Key; done: Key; tone?: "danger" }> = {
  START_REVIEW: { label: "ar.start", title: "ar.startTitle", note: "ar.startNote", done: "ar.startDone" },
  RESOLVE: { label: "ar.resolve", title: "ar.resolveTitle", note: "ar.resolveNote", done: "ar.resolveDone" },
  DISMISS: { label: "ar.dismiss", title: "ar.dismissTitle", note: "ar.dismissNote", done: "ar.dismissDone", tone: "danger" },
};

export function AdminReportsPage() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const reports = useResource(() => api.adminReports(), []);
  // Reports carry provider ids only; the providers list supplies names and current status.
  const providers = useResource(() => api.adminProviders(), []);
  const byId = new Map((providers.data ?? []).map((p) => [p.provider_id, p]));
  const names = new Map((providers.data ?? []).map((p) => [p.provider_id, p.name]));
  const [target, setTarget] = useState<{ report: Report; action: Action } | null>(null);
  const [suspending, setSuspending] = useState<AdminProvider | null>(null);

  // Deep link (notification e-mail): /admin/reports/:id highlights that report.
  const { id } = useParams();
  const navigate = useNavigate();
  const found = !!id && !!reports.data?.some((r) => r.report_id === id);
  const missing = !!id && !!reports.data && !found;
  useFocusTarget(id, found);

  return (
    <>
      <PageHeader title={t("ws.reports")} subtitle={t("ar.sub")} />
      {missing && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="info" action={<Link className="small nowrap" to="/admin/reports">{t("ar.viewOpen")}</Link>}>
            <strong>{t("ar.missing")}</strong>
            <span>{t("ar.missingText")}</span>
          </Banner>
        </div>
      )}
      {reports.loading && !reports.data ? <CardSkeleton rows={2} />
        : reports.error ? <ErrorState error={reports.error} onRetry={reports.reload} title={t("ar.error")} />
          : reports.data!.length === 0 ? <div className="card"><EmptyState icon={<Flag size={24} />} title={t("ar.none")}>{t("ar.noneText")}</EmptyState></div>
            : (
              <div className="stack">
                {reports.data!.map((report) => {
                  const status = statusOf(REPORT_STATUS, report.status);
                  const provider = byId.get(report.provider_id);
                  return (
                    <article id={focusDomId(report.report_id)} className={`card card-pad stack-sm${report.report_id === id ? " focus-target" : ""}`} key={report.report_id}>
                      <div className="row-between">
                        <div>
                          <strong>{reportReasonLabel(report.reason, lang)}</strong>
                          <div className="muted xs">{t("ar.meta", { booking: report.booking_id.slice(0, 8).toUpperCase(), provider: names.get(report.provider_id) ?? report.provider_id.slice(0, 8), date: formatDateTime(report.created_at) })}</div>
                        </div>
                        <StatusBadge label={t(status.label)} tone={status.tone} />
                      </div>
                      <p className="small" style={{ whiteSpace: "pre-line" }}>{report.description}</p>
                      {report.evidence_url && <a className="small" href={report.evidence_url} target="_blank" rel="noreferrer">{t("rps.viewEvidence")}</a>}
                      {provider && (
                        <div className="row small">
                          <span className="muted">{t("ar.providerStatus")}</span>
                          <StatusBadge label={t(statusOf(PROVIDER_STATUS, provider.status).label)} tone={statusOf(PROVIDER_STATUS, provider.status).tone} />
                        </div>
                      )}
                      <div className="report-foot">
                      <div className="actions" aria-label={t("ar.providerActions")} role="group">
                        <ButtonLink size="sm" variant="secondary" to={`/admin/providers/${report.provider_id}`}>{t("bd.viewProvider")}</ButtonLink>
                        {provider?.status === "APPROVED" && <Button size="sm" variant="danger-outline" onClick={() => setSuspending(provider)}>{t("ar.suspendProvider")}</Button>}
                      </div>
                      <div className="actions" aria-label={t("ar.reportActions")} role="group">
                        {report.status === "OPEN" && <Button size="sm" variant="secondary" onClick={() => setTarget({ report, action: "START_REVIEW" })}>{t("ar.start")}</Button>}
                        <Button size="sm" onClick={() => setTarget({ report, action: "RESOLVE" })}>{t("ar.resolve")}</Button>
                        <Button size="sm" variant="danger-outline" onClick={() => setTarget({ report, action: "DISMISS" })}>{t("ar.dismiss")}</Button>
                      </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
      <NoteModal open={!!target} title={target ? t(COPY[target.action].title) : ""} label={target ? t(COPY[target.action].note) : ""}
        confirmLabel={target ? t(COPY[target.action].label) : ""} tone={target ? COPY[target.action].tone : undefined}
        onClose={() => setTarget(null)}
        onSubmit={async (note) => {
          await api.adminProcessReport(target!.report.report_id, target!.action, note);
          toast.success(t(COPY[target!.action].done));
          setTarget(null);
          if (id) navigate("/admin/reports", { replace: true });
          await reports.reload();
        }} />
      <NoteModal open={!!suspending} title={suspending ? t(SUSPEND.title, { name: suspending.name }) : ""} label={t(SUSPEND.noteLabel)}
        confirmLabel={t(SUSPEND.label)} tone={SUSPEND.tone}
        intro={<p className="muted small">{t("ar.suspendIntro")}</p>}
        onClose={() => setSuspending(null)}
        onSubmit={async (reason) => {
          await api.adminSetProviderStatus(suspending!.provider_id, SUSPEND.status, reason);
          toast.success(t(SUSPEND.done));
          setSuspending(null);
          await Promise.all([providers.reload(), reports.reload()]);
        }} />
    </>
  );
}
