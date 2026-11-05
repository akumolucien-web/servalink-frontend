import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { withNext } from "../../lib/redirect";
import { isLocalIntegration } from "../../config/env";
import { formatCmPhone } from "../../lib/phone";
import { AuthInput } from "../../components/auth/AuthFields";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Display";
import { useT } from "../../i18n/I18nProvider";

const RESEND_SECONDS = 60;

export function VerifyCodePage() {
  const { adapter } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = params.get("phone") ?? "";
  const next = params.get("next");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!phone) {
    return (
      <section aria-labelledby="verify-title">
        <h1 id="verify-title" className="auth-title">{t("verify.missingTitle")}</h1>
        <p className="auth-sub">{t("verify.missingSub")}</p>
        <div className="auth-form"><Link to="/register" className="btn btn-primary btn-lg btn-block auth-submit">{t("register.submit")}</Link></div>
      </section>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) { setError(t("auth.codeRequired")); return; }
    setBusy(true); setError(undefined);
    try {
      await adapter!.confirmSignUp(phone, code);
      navigate(withNext(`/login?verified=1&phone=${encodeURIComponent(phone)}`, next), { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("verify.failed"));
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(undefined); setNotice(undefined);
    try {
      await adapter!.resendCode(phone);
      setNotice(t("verify.newCodeSent"));
      setCooldown(RESEND_SECONDS);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("verify.resendFailed"));
    }
  };

  return (
    <section aria-labelledby="verify-title">
      <h1 id="verify-title" className="auth-title">{t("verify.title")}</h1>
      <p className="auth-sub">{t("verify.sub")} <strong>{formatCmPhone(phone)}</strong>.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {isLocalIntegration && <Banner tone="info">{t("auth.localVerifyCode")} <strong>123456</strong>.</Banner>}
        {notice && <Banner tone="success">{notice}</Banner>}
        {error && <Banner tone="danger">{error}</Banner>}
        <AuthInput label={t("auth.code")} placeholder={t("auth.codePlaceholder")} icon={<KeyRound size={19} />} inputMode="numeric"
          autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="submit" size="lg" block loading={busy} className="auth-submit">
          {t("verify.submit")} {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
        <div className="auth-row" style={{ justifyContent: "center" }}>
          <Button variant="ghost" size="sm" onClick={resend} disabled={cooldown > 0}>{cooldown > 0 ? t("verify.resendIn", { seconds: cooldown }) : t("verify.resend")}</Button>
        </div>
      </form>
    </section>
  );
}
