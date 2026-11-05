import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Phone, User } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { AuthInput } from "../../components/auth/AuthFields";
import { Button } from "../../components/ui/Button";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { TermsCheckbox } from "../../components/domain/Legal";
import { Banner } from "../../components/ui/Display";
import { hasErrors, type Errors } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { FullPageLoading } from "../../auth/guards";
import { withLang } from "../../i18n/core";
import { useT } from "../../i18n/I18nProvider";
import { formatCmPhone } from "../../lib/phone";
import { safeNext } from "../../lib/redirect";

/** Shown when GET /profile returns 404: the account exists in Cognito but not yet in ServaLink. */
export function OnboardingPage() {
  const { profile, accountLoading, saveProfile, isAdmin, session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const [params] = useSearchParams();
  const destination = safeNext(params.get("next"), "/app");
  const [form, setForm] = useState({ full_name: "", region: "", city: "", quartier: "" });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors<"full_name" | "region" | "city" | "phone" | "terms" | "form">>({});
  const [busy, setBusy] = useState(false);

  if (isAdmin) return <Navigate to="/admin" replace />;
  if (accountLoading || profile === undefined) return <FullPageLoading />;
  if (profile) return <Navigate to={destination} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.full_name.trim()) next.full_name = t("auth.nameRequired");
    if (!form.region) next.region = t("auth.regionRequired");
    if (form.region && !form.city) next.city = t("auth.cityRequired");
    if (!agreed) next.terms = t("onboarding.termsRequired");
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      await saveProfile(withLang({
        full_name: form.full_name.trim(), region: form.region, city: form.city,
        ...(form.quartier.trim() ? { quartier: form.quartier.trim() } : {}), accept_terms: true,
      }));
      toast.success(t("onboarding.saved"));
      navigate(destination, { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : t("onboarding.failed") });
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="onboarding-title">
      <h1 id="onboarding-title" className="auth-title">{t("onboarding.title")}</h1>
      <p className="auth-sub">{t("onboarding.sub", { who: session?.email || formatCmPhone(session?.phone ?? "") })}</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <AuthInput label={t("auth.fullName")} icon={<User size={19} />} autoComplete="name" value={form.full_name} error={errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <LocationPicker level="quartier" value={form} errors={errors} onChange={(v) => setForm({ ...form, ...v })} />
        <AuthInput label={t("auth.phone")} placeholder={t("auth.phonePlaceholder")} icon={<Phone size={19} />} type="tel" value={formatCmPhone(session?.phone ?? "")} disabled readOnly hint={t("prof.phoneHint")} />
        <TermsCheckbox checked={agreed} error={errors.terms} onChange={setAgreed} />
        <Button type="submit" size="lg" block loading={busy} className="auth-submit">{t("onboarding.save")} {!busy && <ArrowRight size={19} aria-hidden="true" />}</Button>
      </form>
    </section>
  );
}
