import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Flag } from "lucide-react";
import { api } from "../../api";
import { Button } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader, StatusBadge } from "../../components/ui/Display";
import { SelectField } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Overlay";
import { useLang, useT } from "../../i18n/I18nProvider";
import { formatDateTime } from "../../lib/format";
import { focusDomId, useFocusTarget } from "../../lib/useFocusTarget";
import { REPORT_STATUS, reportReasonLabel, statusOf } from "../../lib/status";
import { useResource } from "../../lib/useResource";

export function ReportsPage() {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const reports = useResource(() => api.myReports(), []);
  const bookings = useResource(() => api.bookings("citizen"), []);
  const [picking, setPicking] = useState(false);
  const [bookingId, setBookingId] = useState("");

  // Deep link (notification): /app/reports/:id highlights that report.
  const { id } = useParams();
  const found = !!id && !!reports.data?.some((r) => r.report_id === id);
  const missing = !!id && !!reports.data && !found;
  useFocusTarget(id, found);
  const byId = new Map((bookings.data ?? []).map((b) => [b.booking_id, b]));
  const reportable = (bookings.data ?? []).filter((b) => !b.report_id);

  return (
    <>
      <PageHeader title={t("rps.title")} subtitle={t("rps.sub")}
        actions={<Button variant="secondary" onClick={() => setPicking(true)} disabled={reportable.length === 0}>{t("rp.title")}</Button>} />
      {missing && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="warning" action={<Link className="small nowrap" to="/app/reports">{t("rp.viewMine")}</Link>}>
            <strong>{t("rps.missing")}</strong>
            <span>{t("rps.missingText")}</span>
          </Banner>
        </div>
      )}
      {reports.loading && !reports.data ? <CardSkeleton rows={2} />
        : reports.error ? <ErrorState error={reports.error} onRetry={reports.reload} title={t("rps.error")} />
          : reports.data!.length === 0 ? (
            <div className="card"><EmptyState icon={<Flag size={24} />} title={t("rps.none")}>
              {t("rps.noneText")}
            </EmptyState></div>
          ) : (
            <div className="stack">
              {reports.data!.map((report) => {
                const booking = byId.get(report.booking_id);
                const status = statusOf(REPORT_STATUS, report.status);
                return (
                  <article id={focusDomId(report.report_id)} className={`card card-pad stack-sm${report.report_id === id ? " focus-target" : ""}`} key={report.report_id}>
                    <div className="row-between">
                      <div>
                        <strong>{reportReasonLabel(report.reason, lang)}</strong>
                        <div className="muted xs">{booking ? <><Link to={`/app/bookings/${booking.booking_id}`}>{booking.reference}</Link> · </> : ""}{formatDateTime(report.created_at)}</div>
                      </div>
                      <StatusBadge label={t(status.label)} tone={status.tone} />
                    </div>
                    <p className="small">{report.description}</p>
                    {report.evidence_url && <a href={report.evidence_url} target="_blank" rel="noreferrer" className="small">{t("rps.viewEvidence")}</a>}
                    {report.admin_note && <p className="hint-box"><strong>{t("rps.adminNote")}</strong> {report.admin_note}</p>}
                  </article>
                );
              })}
            </div>
          )}

      <Modal open={picking} title={t("rp.title")} onClose={() => setPicking(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setPicking(false)}>{t("common.cancel")}</Button>
          <Button disabled={!bookingId} onClick={() => navigate(`/app/bookings/${bookingId}/report`)}>{t("rps.continue")}</Button>
        </>}>
        <div className="modal-body form">
          <SelectField label={t("rps.which")} value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
            <option value="">{t("rps.chooseBooking")}</option>
            {reportable.map((b) => <option key={b.booking_id} value={b.booking_id}>{b.reference} · {b.provider_name}</option>)}
          </SelectField>
        </div>
      </Modal>
    </>
  );
}
