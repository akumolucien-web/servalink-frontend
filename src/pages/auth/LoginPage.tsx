import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { AuthError } from "../../auth/adapter";
import { useAuth } from "../../auth/AuthContext";
import { AuthPasswordInput, AuthInput } from "../../components/auth/AuthFields";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Display";
import { useT } from "../../i18n/I18nProvider";
import { normalizeCmPhone } from "../../lib/phone";
import { withNext } from "../../lib/redirect";

export function LoginPage() {
  const { signIn, sessionExpired } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const username = normalizeCmPhone(phone);
    const next = {
      phone: username ? undefined : t("auth.phoneInvalid"),
      password: password ? undefined : t("login.passwordRequired"),
    };
    setErrors(next);
    if (!username || next.password) return;
    setBusy(true);
    try {
      await signIn(username, password, remember);
      // GuestOnly redirects to ?next=, /app or /admin once the session exists.
    } catch (error) {
      if (error instanceof AuthError && error.code === "UserNotConfirmedException") {
        navigate(withNext(`/verify?phone=${encodeURIComponent(username)}`, params.get("next")), { replace: true });
        return;
      }
      setErrors({ form: error instanceof Error ? error.message : t("login.failed") });
      setBusy(false);
    }
  };

  const next = params.get("next");
  return (
    <section aria-labelledby="login-title">
      <h1 id="login-title" className="auth-title">{t("login.title")}</h1>
      <p className="auth-sub">{t("login.sub")}</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {params.get("verified") && <Banner tone="success">{t("login.verified")}</Banner>}
        {params.get("reset") && <Banner tone="success">{t("login.reset")}</Banner>}
        {sessionExpired && <Banner tone="warning">{t("login.expired")}</Banner>}
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <AuthInput label={t("auth.phone")} placeholder={t("auth.phonePlaceholder")} icon={<Phone size={19} />} type="tel" autoComplete="tel" value={phone}
          error={errors.phone} onChange={(e) => setPhone(e.target.value)} />
        <AuthPasswordInput label={t("common.password")} autoComplete="current-password" value={password} error={errors.password}
          onChange={(e) => setPassword(e.target.value)} />
        <div className="auth-row">
          <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />{t("login.remember")}</label>
          <Link to="/forgot-password">{t("login.forgot")}</Link>
        </div>
        <Button type="submit" size="lg" block loading={busy} className="auth-submit">
          {t("login.submit")} {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
        <div className="auth-or" aria-hidden="true">{t("auth.or")}</div>
        <p className="auth-switch">{t("login.noAccount")}<Link to={withNext("/register", next)}>{t("login.signUp")}</Link></p>
      </form>
    </section>
  );
}
