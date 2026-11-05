import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, uploadImage } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { TermsCheckbox } from "../../components/domain/Legal";
import { ImagePicker } from "../../components/domain/Provider";
import { Button } from "../../components/ui/Button";
import { Avatar, Banner, PageHeader } from "../../components/ui/Display";
import { hasErrors, TextField, type Errors } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { useT } from "../../i18n/I18nProvider";
import { formatDate } from "../../lib/format";
import { citiesOf, fold } from "../../lib/locations";
import { formatCmPhone, normalizeCmPhone } from "../../lib/phone";

export function ProfilePage() {
  const { profile, saveProfile, session, hasProviderTools } = useAuth();
  const t = useT();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", region: "", city: "", quartier: "", phone: "" });
  const [agreed, setAgreed] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [ownPhoto, setOwnPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors<"full_name" | "region" | "city" | "phone" | "terms" | "form">>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const region = profile.region ?? "";
    // Use the dataset spelling of the saved city so the select shows it.
    const city = citiesOf(region).find((c) => fold(c.name) === fold(profile.city))?.name ?? (region ? "" : profile.city);
    setForm({ full_name: profile.full_name, region, city, quartier: profile.quartier ?? "", phone: profile.phone ?? "" });
  }, [profile]);
  // GET /profile returns only the image key, so a photo URL is available just for approved providers.
  useEffect(() => {
    if (hasProviderTools && session) api.provider(session.sub).then((p) => setOwnPhoto(p.photo_url)).catch(() => {});
  }, [hasProviderTools, session]);

  const needsTerms = !!profile && !profile.terms_accepted_at;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.full_name.trim()) next.full_name = t("auth.nameRequired");
    if (!form.region) next.region = t("auth.regionRequired");
    if (form.region && !form.city) next.city = t("auth.cityRequired");
    if (!normalizeCmPhone(form.phone)) next.phone = t("auth.phoneInvalid");
    if (needsTerms && !agreed) next.terms = t("onboarding.termsRequired");
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      const profile_image_key = photo ? await uploadImage(photo, "PROFILE_IMAGE") : undefined;
      await saveProfile({
        full_name: form.full_name.trim(), region: form.region, city: form.city, quartier: form.quartier.trim(), phone: form.phone.trim(),
        ...(needsTerms ? { accept_terms: true } : {}),
        ...(profile_image_key ? { profile_image_key } : {}),
      });
      setPhoto(null);
      toast.success(t("onboarding.saved"));
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("prof.failed") });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={t("prof.title")} subtitle={t("prof.sub")} />
      <div className="two-col">
        <form className="card card-pad stack" onSubmit={submit} noValidate aria-label={t("prof.aria")}>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <div className="form-grid">
            <TextField className="span-2" label={t("auth.fullName")} autoComplete="name" value={form.full_name} error={errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <TextField label={t("auth.phone")} type="tel" placeholder="+237 6XX XXX XXX" autoComplete="tel" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-grid"><LocationPicker level="quartier" value={form} errors={errors} onChange={(v) => setForm({ ...form, ...v })} /></div>
          <TextField label={t("f.email")} value={session?.email ?? ""} disabled readOnly hint={t("prof.emailHint")} />
          <ImagePicker label={t("prof.photo")} file={photo} onChange={setPhoto}
            hint={profile?.profile_image_key ? t("prof.photoSaved") : t("image.hint")} />
          {needsTerms && <TermsCheckbox checked={agreed} error={errors.terms} onChange={setAgreed} />}
          <div className="row" style={{ justifyContent: "flex-end" }}><Button type="submit" loading={busy}>{t("common.save")}</Button></div>
        </form>
        <aside className="card card-pad stack-sm" style={{ justifyItems: "start" }}>
          <Avatar name={profile?.full_name} src={ownPhoto} size={72} />
          <strong>{profile?.full_name}</strong>
          <span className="muted small">{session?.email || formatCmPhone(session?.phone ?? "")}</span>
          {profile?.created_at && <span className="muted xs">{t("prof.member", { date: formatDate(profile.created_at) })}</span>}
        </aside>
      </div>
    </>
  );
}
