import { useState, type FormEvent } from "react";
import { Copy, MessageCircle, UserCheck } from "lucide-react";
import { api, ApiError, type Vouch } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader, RatingChip, StatusBadge } from "../../components/ui/Display";
import { hasErrors, TextAreaField, TextField, type Errors } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { useT } from "../../i18n/I18nProvider";
import { formatCmPhone, normalizeCmPhone, whatsappUrl } from "../../lib/phone";
import { statusOf, VOUCH_STATUS } from "../../lib/status";
import { formatJobMonth, isValidJobMonth, jobMonthBounds } from "../../lib/vouch";
import { useResource } from "../../lib/useResource";

const EMPTY = { client_name: "", client_phone: "", job_summary: "", job_month: "" };

export function ProviderVouchesPage() {
  const { displayName } = useAuth();
  const t = useT();
  const toast = useToast();
  const vouches = useResource(() => api.myVouches(), []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors<keyof typeof EMPTY | "form">>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ vouch: Vouch; link: string }>();
  const { min, max } = jobMonthBounds();
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const phone = normalizeCmPhone(form.client_phone);
    const next: typeof errors = {};
    if (form.client_name.trim().length < 2 || form.client_name.trim().length > 80) next.client_name = t("vp.errName");
    if (!phone) next.client_phone = t("auth.phoneInvalid");
    if (form.job_summary.trim().length < 10 || form.job_summary.trim().length > 300) next.job_summary = t("vp.errSummary");
    if (!isValidJobMonth(form.job_month)) next.job_month = t("vp.errMonth");
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      setCreated(await api.createVouch({ ...form, client_name: form.client_name.trim(), client_phone: phone!, job_summary: form.job_summary.trim() }));
      setForm(EMPTY);
      await vouches.reload();
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("vp.failed") });
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(created!.link); toast.success(t("vp.copied")); }
    catch { toast.error(t("vp.copyFailed")); }
  };

  return (
    <>
      <PageHeader title={t("vp.title")} subtitle={t("vp.sub")} />
      <div className="stack">
        <Banner>{t("vp.smsNote")}</Banner>

        <div role="status">{created && (
          <section className="card card-pad stack-sm" aria-label={t("vp.readyTitle", { name: created.vouch.client_name })}>
            <h2 style={{ fontSize: "1.0625rem" }}>{t("vp.readyTitle", { name: created.vouch.client_name })}</h2>
            <p className="muted small">{t("vp.readyText")}</p>
            <p className="small" style={{ wordBreak: "break-all" }}>{created.link}</p>
            <div className="row">
              <a className="btn btn-primary" target="_blank" rel="noopener noreferrer"
                href={whatsappUrl(created.vouch.client_phone, t("vouch.shareText", { provider: displayName, link: created.link }))}>
                <MessageCircle size={16} aria-hidden="true" />{t("vp.whatsapp")}
              </a>
              <Button variant="secondary" icon={<Copy size={16} />} onClick={copy}>{t("vp.copy")}</Button>
            </div>
          </section>
        )}</div>

        <form className="card card-pad stack" onSubmit={submit} noValidate aria-label={t("vp.formTitle")} style={{ maxWidth: 680 }}>
          <h2 style={{ fontSize: "1.0625rem" }}>{t("vp.formTitle")}</h2>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <div className="form-grid">
            <TextField label={t("vp.clientName")} autoComplete="off" maxLength={80} value={form.client_name} error={errors.client_name} onChange={set("client_name")} />
            <TextField label={t("vp.clientPhone")} type="tel" placeholder="+237 6XX XXX XXX" autoComplete="off" value={form.client_phone} error={errors.client_phone} onChange={set("client_phone")} />
          </div>
          <TextAreaField label={t("vp.jobSummary")} hint={t("vp.jobSummaryHint")} maxLength={300} value={form.job_summary} error={errors.job_summary} onChange={set("job_summary")} />
          <TextField label={t("vp.jobMonth")} type="month" min={min} max={max} placeholder="YYYY-MM" value={form.job_month} error={errors.job_month} onChange={set("job_month")} />
          <div className="row" style={{ justifyContent: "flex-end" }}><Button type="submit" loading={busy}>{t("vp.create")}</Button></div>
        </form>

        <section className="card" aria-label={t("vp.listTitle")}>
          <div className="card-head"><h2 style={{ fontSize: "1.0625rem" }}>{t("vp.listTitle")}</h2></div>
          {vouches.loading && !vouches.data ? <CardSkeleton rows={2} />
            : vouches.error ? <ErrorState error={vouches.error} onRetry={vouches.reload} />
              : vouches.data!.length === 0 ? <EmptyState icon={<UserCheck size={24} />} title={t("vp.emptyTitle")}>{t("vp.emptyText")}</EmptyState>
                : vouches.data!.map((v) => {
                  const status = statusOf(VOUCH_STATUS, v.status);
                  return (
                    <div className="service-row" key={v.created_at}>
                      <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                        <strong>{v.client_name}</strong>
                        <p className="muted small">{formatCmPhone(v.client_phone)} · {formatJobMonth(v.job_month)}</p>
                        <p className="small">{v.job_summary}</p>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        {v.status === "CONFIRMED" && <RatingChip rating={v.rating} />}
                        <StatusBadge label={t(status.label)} tone={status.tone} />
                      </div>
                    </div>
                  );
                })}
        </section>
      </div>
    </>
  );
}
