import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, LinkIcon, ThumbsDown } from "lucide-react";
import { api, ApiError, type Rating, type VouchStatus } from "../../api";
import { Button } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState } from "../../components/ui/Display";
import { TextAreaField, TextField } from "../../components/ui/Field";
import { useLang, useT } from "../../i18n/I18nProvider";
import { ratingLabel, RATING_ORDER } from "../../lib/status";
import { formatJobMonth } from "../../lib/vouch";
import { useResource } from "../../lib/useResource";

/** Public page a client opens from the link the provider sent. No sign-in; the SMS code proves it is the client. */
export function VouchPage() {
  const { token = "" } = useParams();
  const t = useT();
  const { lang } = useLang();
  const vouch = useResource(() => api.publicVouch(token), [token]);
  const [done, setDone] = useState<VouchStatus>();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [rating, setRating] = useState<Rating | "">("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ code?: string; rating?: string; form?: string }>({});
  const [busy, setBusy] = useState<"SEND_CODE" | "CONFIRM" | "DENY">();

  const invalid = (
    <div className="card"><EmptyState icon={<LinkIcon size={24} />} title={t("vouch.pub.invalidTitle")}>{t("vouch.pub.invalidText")}</EmptyState></div>
  );
  if (vouch.loading && !vouch.data) return <div className="section"><CardSkeleton rows={3} /></div>;
  if (vouch.error) {
    return vouch.error instanceof ApiError && vouch.error.status === 404 ? <div className="section">{invalid}</div>
      : <div className="section"><ErrorState error={vouch.error} onRetry={vouch.reload} /></div>;
  }
  const v = vouch.data!;
  const status = done ?? v.status;

  const run = async (action: "SEND_CODE" | "CONFIRM" | "DENY") => {
    const next: typeof errors = {};
    if (action !== "SEND_CODE" && !/^\d{6}$/.test(code.trim())) next.code = t("vouch.pub.errCode");
    if (action === "CONFIRM" && !rating) next.rating = t("vouch.pub.errRating");
    setErrors(next);
    if (next.code || next.rating) return;
    setBusy(action);
    try {
      if (action === "SEND_CODE") { await api.vouchAction(token, { action }); setCodeSent(true); }
      else if (action === "DENY") { await api.vouchAction(token, { action, code: code.trim() }); setDone("DENIED"); }
      else { await api.vouchAction(token, { action, code: code.trim(), rating: rating as Rating, ...(comment.trim() ? { comment: comment.trim() } : {}) }); setDone("CONFIRMED"); }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) { setDone(undefined); await vouch.reload(); } // link gone or already answered: show the real state
      else setErrors({ form: error instanceof ApiError ? error.message : t("vouch.pub.failed") });
    } finally { setBusy(undefined); }
  };

  if (status === "CONFIRMED" || status === "DENIED") {
    const ok = status === "CONFIRMED";
    return (
      <div className="section"><div className="card">
        <EmptyState icon={ok ? <CheckCircle2 size={24} /> : <ThumbsDown size={24} />} title={t(ok ? "vouch.pub.doneTitle" : "vouch.pub.deniedTitle")}>
          {ok ? t("vouch.pub.doneText", { provider: v.provider_name }) : t("vouch.pub.deniedText")}
        </EmptyState>
      </div></div>
    );
  }
  if (status !== "PENDING") return <div className="section">{invalid}</div>;

  return (
    <div className="section" style={{ maxWidth: 680 }}>
      <form className="card card-pad stack" noValidate aria-label={t("vouch.pub.title")}
        onSubmit={(e: FormEvent) => { e.preventDefault(); void run("CONFIRM"); }}>
        <h1 style={{ fontSize: "1.5rem" }}>{t("vouch.pub.title")}</h1>
        <div className="stack-sm">
          <p>{t("vouch.pub.hello", { name: v.client_first_name })}</p>
          <p>{t("vouch.pub.intro", { provider: v.provider_name, month: formatJobMonth(v.job_month, lang) })}</p>
          <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: "3px solid var(--border-strong)" }}>{v.job_summary}</blockquote>
        </div>

        <p className="muted small">{t("vouch.pub.codeHelp", { provider: v.provider_name })}</p>
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        {codeSent && <Banner tone="success">{t("vouch.pub.codeSent")}</Banner>}
        <div className="row">
          <Button variant="secondary" loading={busy === "SEND_CODE"} onClick={() => run("SEND_CODE")}>{t(codeSent ? "vouch.pub.resend" : "vouch.pub.sendCode")}</Button>
        </div>
        <TextField label={t("vouch.pub.code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} error={errors.code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label" style={{ marginBottom: 8 }}>{t("vouch.pub.how")}</legend>
          <div className="rating-picker" role="radiogroup" aria-label={t("vouch.pub.ratingAria")}>
            {RATING_ORDER.map((value) => (
              <label className="rating-option" key={value}>
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => { setRating(value); setErrors((e) => ({ ...e, rating: undefined })); }} />
                <span>{ratingLabel(value, lang)}</span>
              </label>
            ))}
          </div>
          {errors.rating && <p className="field-error" role="alert" style={{ marginTop: 6 }}>{errors.rating}</p>}
        </fieldset>
        <TextAreaField label={t("vouch.pub.comment")} optional maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="ghost" loading={busy === "DENY"} onClick={() => run("DENY")}>{t("vouch.pub.deny")}</Button>
          <Button type="submit" loading={busy === "CONFIRM"}>{t("vouch.pub.confirm")}</Button>
        </div>
      </form>
    </div>
  );
}
