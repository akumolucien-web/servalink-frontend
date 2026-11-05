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

export function ForgotPasswordPage() {
  const { adapter } = useAuth();
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
    if (!phone) { setErrors({ phone: "Enter a Cameroon number, e.g. 6 77 12 34 56" }); return; }
    setBusy(true); setErrors({});
    try {
      await adapter!.forgotPassword(phone);
      setStep("reset");
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "We couldn't send a code." });
    } finally { setBusy(false); }
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    const next = { code: code.trim() ? undefined : "Enter the 6-digit code from your SMS", password: passwordProblem(password) };
    setErrors(next);
    if (!phone || next.code || next.password) return;
    setBusy(true);
    try {
      await adapter!.confirmForgotPassword(phone, code, password);
      navigate(`/login?reset=1&phone=${encodeURIComponent(phone)}`, { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "We couldn't reset your password." });
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="forgot-title">
      <h1 id="forgot-title" className="auth-title">Reset your password</h1>
      <p className="auth-sub">{step === "phone" ? "Enter your phone number and we'll send you a code by SMS." : `Enter the 6-digit code we sent by SMS to ${formatCmPhone(phone ?? "")}.`}</p>
      {step === "phone" ? (
        <form className="auth-form" onSubmit={requestCode} noValidate>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <AuthInput label="Phone number" placeholder="Phone (e.g. 6 77 12 34 56)" icon={<Phone size={19} />} type="tel" autoComplete="tel" value={phoneInput} error={errors.phone} onChange={(e) => setPhoneInput(e.target.value)} />
          <Button type="submit" size="lg" block loading={busy} className="auth-submit">Send code {!busy && <ArrowRight size={19} aria-hidden="true" />}</Button>
          <p className="auth-back"><Link to="/login">Back to log in</Link></p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={reset} noValidate>
          {isLocalIntegration && <Banner tone="info">Local integration mode: the code is <strong>123456</strong>.</Banner>}
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <AuthInput label="Verification code" placeholder="6-digit code" icon={<KeyRound size={19} />} inputMode="numeric" autoComplete="one-time-code" value={code} error={errors.code} onChange={(e) => setCode(e.target.value)} />
          <AuthPasswordInput label="New password" autoComplete="new-password" value={password} error={errors.password}
            hint="At least 8 characters with uppercase, lowercase and a number." onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" size="lg" block loading={busy} className="auth-submit">Update password {!busy && <ArrowRight size={19} aria-hidden="true" />}</Button>
          <p className="auth-back"><Link to="/login">Back to log in</Link></p>
        </form>
      )}
    </section>
  );
}
