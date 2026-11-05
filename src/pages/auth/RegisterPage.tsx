import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Mail, Phone, User } from "lucide-react";
import { withNext } from "../../lib/redirect";
import { AuthError } from "../../auth/adapter";
import { useAuth } from "../../auth/AuthContext";
import { rememberPendingProfile } from "../../auth/pendingProfile";
import { AuthInput, AuthPasswordInput } from "../../components/auth/AuthFields";
import { LegalLinks } from "../../components/domain/Legal";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Display";
import { normalizeCmPhone } from "../../lib/phone";
import { isEmail, passwordProblem, hasErrors, type Errors } from "../../components/ui/Field";
import { useT } from "../../i18n/I18nProvider";

type Key = "name" | "email" | "phone" | "region" | "city" | "password" | "confirm" | "form";

export function RegisterPage() {
  const { adapter } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get("next");
  const [form, setForm] = useState({ name: "", email: "", phone: "", region: "", city: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors<Key>>({});
  const [busy, setBusy] = useState(false);
  const [exists, setExists] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const validate = (): Errors<Key> => {
    const next: Errors<Key> = {};
    if (!form.name.trim()) next.name = t("auth.nameRequired");
    if (!normalizeCmPhone(form.phone)) next.phone = t("auth.phoneInvalid");
    if (form.email.trim() && !isEmail(form.email)) next.email = t("auth.emailInvalid");
    if (!form.region) next.region = t("auth.regionRequired");
    if (form.region && !form.city) next.city = t("auth.cityRequired");
    const problem = passwordProblem(form.password);
    if (problem) next.password = problem;
    if (form.confirm !== form.password) next.confirm = t("register.mismatch");
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (hasErrors(next) || !adapter) return;
    setBusy(true); setExists(false);
    try {
      const phone = normalizeCmPhone(form.phone)!; // validated above
      const email = form.email.trim().toLowerCase() || undefined;
      await adapter.signUp({ phone, password: form.password, fullName: form.name.trim(), email });
      // Profile details are saved to ServaLink after the first login (PUT /profile needs a token).
      rememberPendingProfile({ phone, full_name: form.name.trim(), region: form.region, city: form.city });
      navigate(withNext(`/verify?phone=${encodeURIComponent(phone)}`, nextPath));
    } catch (error) {
      setExists(error instanceof AuthError && error.code === "UsernameExistsException");
      setErrors({ form: error instanceof Error ? error.message : t("register.failed") });
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="register-title">
      <h1 id="register-title" className="auth-title">{t("register.title")}</h1>
      <p className="auth-sub">{t("register.sub")}</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {errors.form && (
          <Banner tone="danger" action={exists ? <Link className="small nowrap" to={withNext("/login", nextPath)}>{t("register.logInShort")}</Link> : undefined}>{errors.form}</Banner>
        )}
        <AuthInput label={t("auth.fullName")} icon={<User size={19} />} autoComplete="name" value={form.name} error={errors.name} onChange={set("name")} />
        <AuthInput label={t("auth.phone")} placeholder={t("auth.phonePlaceholder")} icon={<Phone size={19} />} type="tel" autoComplete="tel" value={form.phone} error={errors.phone} onChange={set("phone")} />
        <AuthInput label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} icon={<Mail size={19} />} type="email" autoComplete="email" value={form.email} error={errors.email} onChange={set("email")} />
        <LocationPicker level="city" value={{ region: form.region, city: form.city, quartier: "" }} errors={errors} onChange={(v) => { setForm((f) => ({ ...f, ...v })); setErrors((e) => ({ ...e, region: undefined, city: undefined })); }} />
        <AuthPasswordInput label={t("common.password")} autoComplete="new-password" value={form.password} error={errors.password}
          hint={t("auth.passwordHint")} onChange={set("password")} />
        <AuthPasswordInput label={t("register.confirm")} autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={set("confirm")} />
        <Button type="submit" size="lg" block loading={busy} className="auth-submit">
          {t("register.submit")} {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
        <p className="small muted" style={{ textAlign: "center" }}>{t("register.consent")}<LegalLinks />.</p>
        <div className="auth-or" aria-hidden="true">{t("auth.or")}</div>
        <p className="auth-switch">{t("register.haveAccount")}<Link to={withNext("/login", nextPath)}>{t("register.logIn")}</Link></p>
      </form>
    </section>
  );
}
