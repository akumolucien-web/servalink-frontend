import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Phone } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { isLocalIntegration } from "../../config/env";
import { AuthInput, AuthPasswordInput } from "../../components/auth/AuthFields";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Display";
import { formatCmPhone, normalizeCmPhone } from "../../lib/phone";
import { passwordProblem } from "../../components/ui/Field";
import { useT } from "../../i18n/I18nProvider";

export function ForgotPasswordPage() {
  const { adapter } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const phone = normalizeCmPhone(phoneInput);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; code?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone) { setErrors({ phone: t("auth.phoneInvalid") }); return; }
    setBusy(true); setErrors({});
    try {
      await adapter!.forgotPassword(phone);
      setStep("reset");
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : t("forgot.sendFailed") });
    } finally { setBusy(false); }
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    const next = { code: code.trim() ? undefined : t("auth.codeRequired"), password: passwordProblem(password) };
    setErrors(next);
    if (!phone || next.code || next.password) return;
    setBusy(true);
    try {
      await adapter!.confirmForgotPassword(phone, code, password);
      navigate(`/login?reset=1&phone=${encodeURIComponent(phone)}`, { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : t("forgot.resetFailed") });
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="forgot-title">
      <h1 id="forgot-title" className="auth-title">{t("forgot.title")}</h1>
      <p className="auth-sub">{step === "phone" ? t("forgot.subPhone") : t("forgot.subReset", { phone: formatCmPhone(phone ?? "") })}</p>
      {step === "phone" ? (
        <form className="auth-form" onSubmit={requestCode} noValidate>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <AuthInput label={t("auth.phone")} placeholder={t("auth.phonePlaceholder")} icon={<Phone size={19} />} type="tel" autoComplete="tel" value={phoneInput} error={errors.phone} onChange={(e) => setPhoneInput(e.target.value)} />
          <Button type="submit" size="lg" block loading={busy} className="auth-submit">{t("forgot.sendCode")} {!busy && <ArrowRight size={19} aria-hidden="true" />}</Button>
          <p className="auth-back"><Link to="/login">{t("auth.backToLogin")}</Link></p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={reset} noValidate>
          {isLocalIntegration && <Banner tone="info">{t("auth.localCode")} <strong>123456</strong>.</Banner>}
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <AuthInput label={t("auth.code")} placeholder={t("auth.codePlaceholder")} icon={<KeyRound size={19} />} inputMode="numeric" autoComplete="one-time-code" value={code} error={errors.code} onChange={(e) => setCode(e.target.value)} />
          <AuthPasswordInput label={t("forgot.newPassword")} autoComplete="new-password" value={password} error={errors.password}
            hint={t("auth.passwordHint")} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" size="lg" block loading={busy} className="auth-submit">{t("forgot.update")} {!busy && <ArrowRight size={19} aria-hidden="true" />}</Button>
          <p className="auth-back"><Link to="/login">{t("auth.backToLogin")}</Link></p>
        </form>
      )}
    </section>
  );
}
