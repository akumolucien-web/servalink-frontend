import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Mail, Phone, User } from "lucide-react";
import { withNext } from "../../lib/redirect";
import { useAuth, rememberPendingProfile } from "../../auth/AuthContext";
import { AuthInput, AuthPasswordInput } from "../../components/auth/AuthFields";
import { LegalLinks } from "../../components/domain/Legal";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Display";
import { normalizeCmPhone } from "../../lib/phone";
import { isEmail, passwordProblem, hasErrors, type Errors } from "../../components/ui/Field";

type Key = "name" | "email" | "phone" | "region" | "city" | "password" | "confirm" | "form";

export function RegisterPage() {
  const { adapter } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get("next");
  const [form, setForm] = useState({ name: "", email: "", phone: "", region: "", city: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors<Key>>({});
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const validate = (): Errors<Key> => {
    const next: Errors<Key> = {};
    if (!form.name.trim()) next.name = "Enter your full name";
    if (!isEmail(form.email)) next.email = "Enter a valid email address";
    if (!normalizeCmPhone(form.phone)) next.phone = "Enter a Cameroon number, e.g. 6 77 12 34 56";
    if (!form.region) next.region = "Select your region";
    if (form.region && !form.city) next.city = "Select your town or city";
    const problem = passwordProblem(form.password);
    if (problem) next.password = problem;
    if (form.confirm !== form.password) next.confirm = "The passwords don't match";
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (hasErrors(next) || !adapter) return;
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      await adapter.signUp(email, form.password);
      // Profile details are saved to ServaLink after the first login (PUT /profile needs a token).
      rememberPendingProfile({ email, full_name: form.name.trim(), region: form.region, city: form.city, phone: form.phone.trim() });
      navigate(withNext(`/verify?email=${encodeURIComponent(email)}`, nextPath));
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "We couldn't create your account. Try again." });
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="register-title">
      <h1 id="register-title" className="auth-title">Create Your Account</h1>
      <p className="auth-sub">Join ServaLink and connect with trusted local professionals.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Banner tone="danger" action={errors.form.includes("already exists") ? <Link className="small nowrap" to={withNext("/login", nextPath)}>Log in</Link> : undefined}>{errors.form}</Banner>
        )}
        <AuthInput label="Full name" icon={<User size={19} />} autoComplete="name" value={form.name} error={errors.name} onChange={set("name")} />
        <AuthInput label="Email" placeholder="Email address" icon={<Mail size={19} />} type="email" autoComplete="email" value={form.email} error={errors.email} onChange={set("email")} />
        <AuthInput label="Phone number" placeholder="Phone (e.g. 6 77 12 34 56)" icon={<Phone size={19} />} type="tel" autoComplete="tel" value={form.phone} error={errors.phone} onChange={set("phone")} />
        <LocationPicker level="city" value={{ region: form.region, city: form.city, quartier: "" }} errors={errors} onChange={(v) => { setForm((f) => ({ ...f, ...v })); setErrors((e) => ({ ...e, region: undefined, city: undefined })); }} />
        <AuthPasswordInput label="Password" autoComplete="new-password" value={form.password} error={errors.password}
          hint="At least 8 characters with uppercase, lowercase and a number." onChange={set("password")} />
        <AuthPasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={set("confirm")} />
        <Button type="submit" size="lg" block loading={busy} className="auth-submit">
          Create Account {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
        <p className="small muted" style={{ textAlign: "center" }}>By creating an account you agree to our <LegalLinks terms="Terms" privacy="Privacy notice" />.</p>
        <div className="auth-or" aria-hidden="true">Or</div>
        <p className="auth-switch">Already have an account?<Link to={withNext("/login", nextPath)}>Log In</Link></p>
      </form>
    </section>
  );
}
