import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { AuthError } from "../../auth/adapter";
import { useAuth } from "../../auth/AuthContext";
import { AuthPasswordInput, AuthInput } from "../../components/auth/AuthFields";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Display";
import { normalizeCmPhone } from "../../lib/phone";
import { withNext } from "../../lib/redirect";

export function LoginPage() {
  const { signIn, sessionExpired } = useAuth();
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
      phone: username ? undefined : "Enter a Cameroon number, e.g. 6 77 12 34 56",
      password: password ? undefined : "Enter your password",
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
      setErrors({ form: error instanceof Error ? error.message : "We couldn't log you in. Try again." });
      setBusy(false);
    }
  };

  const next = params.get("next");
  return (
    <section aria-labelledby="login-title">
      <h1 id="login-title" className="auth-title">Welcome Back</h1>
      <p className="auth-sub">Log in to your account to find or manage local services.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {params.get("verified") && <Banner tone="success">Phone number verified. Log in to continue.</Banner>}
        {params.get("reset") && <Banner tone="success">Password updated. Log in with your new password.</Banner>}
        {sessionExpired && <Banner tone="warning">Your session expired. Please log in again.</Banner>}
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <AuthInput label="Phone number" placeholder="Phone (e.g. 6 77 12 34 56)" icon={<Phone size={19} />} type="tel" autoComplete="tel" value={phone}
          error={errors.phone} onChange={(e) => setPhone(e.target.value)} />
        <AuthPasswordInput label="Password" autoComplete="current-password" value={password} error={errors.password}
          onChange={(e) => setPassword(e.target.value)} />
        <div className="auth-row">
          <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me</label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" block loading={busy} className="auth-submit">
          Login {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
        <div className="auth-or" aria-hidden="true">Or</div>
        <p className="auth-switch">Don't have an account?<Link to={withNext("/register", next)}>Sign Up</Link></p>
      </form>
    </section>
  );
}
