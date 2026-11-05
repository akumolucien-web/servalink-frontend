import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { api, ApiError, uploadImage } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { BackLink, ImagePicker } from "../../components/domain/Provider";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { SelectField, TextAreaField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { useT } from "../../i18n/I18nProvider";
import { REPORT_REASONS } from "../../lib/status";
import { useResource } from "../../lib/useResource";

export function ReportPage() {
  const { id = "" } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const toast = useToast();
  const booking = useResource(() => api.booking(id), [id]);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ reason?: string; description?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (booking.loading && !booking.data) return <CardSkeleton rows={2} />;
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} />;
  const b = booking.data!;
  const back = `/app/bookings/${b.booking_id}`;

  if (b.citizen_id !== session?.sub || b.report_id) {
    return (
      <div className="card"><EmptyState icon={b.report_id ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
        title={t(b.report_id ? "rp.already" : "rp.cant")}
        action={<ButtonLink to={b.report_id ? "/app/reports" : back} variant="secondary">{t(b.report_id ? "rp.viewMine" : "rp.backToBooking")}</ButtonLink>}>
        {t(b.report_id ? "rp.onceText" : "rp.onlyCustomer")}
      </EmptyState></div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!reason) next.reason = t("rp.chooseReason");
    if (!description.trim()) next.description = t("rp.describe");
    setErrors(next);
    if (next.reason || next.description) return;
    setBusy(true);
    try {
      const evidence_key = evidence ? await uploadImage(evidence, "REPORT_EVIDENCE") : undefined;
      await api.createReport({ booking_id: b.booking_id, reason, description: description.trim(), evidence_key });
      toast.success(t("rp.submitted"));
      navigate("/app/reports", { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("rp.failed") });
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to={back}>{t("rp.backToBooking")}</BackLink>
      <PageHeader title={t("rp.title")} subtitle={t("rp.sub", { ref: b.reference, name: b.provider_name })} />
      <form className="card card-pad stack" style={{ maxWidth: 680 }} onSubmit={submit} noValidate aria-label={t("rp.formAria")}>
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <SelectField label={t("rp.whatWrong")} value={reason} error={errors.reason} onChange={(e) => { setReason(e.target.value); setErrors((er) => ({ ...er, reason: undefined })); }}>
          <option value="">{t("rp.chooseReason")}</option>
          {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
        </SelectField>
        <TextAreaField label={t("rp.describe")} value={description} error={errors.description} maxLength={2000}
          hint={t("rp.describeHint")} onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }} />
        <ImagePicker label={t("rp.evidence")} file={evidence} onChange={setEvidence} hint={t("rp.evidenceHint")} />
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <ButtonLink variant="ghost" to={back}>{t("common.cancel")}</ButtonLink>
          <Button type="submit" loading={busy}>{t("rp.submit")}</Button>
        </div>
      </form>
    </>
  );
}
