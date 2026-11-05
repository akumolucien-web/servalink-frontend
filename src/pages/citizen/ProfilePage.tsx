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
import { formatDate } from "../../lib/format";
import { citiesOf, fold } from "../../lib/locations";
import { formatCmPhone, normalizeCmPhone } from "../../lib/phone";

export function ProfilePage() {
  const { profile, saveProfile, session, hasProviderTools } = useAuth();
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
    if (!form.full_name.trim()) next.full_name = "Enter your full name";
    if (!form.region) next.region = "Select your region";
    if (form.region && !form.city) next.city = "Select your town or city";
    if (!normalizeCmPhone(form.phone)) next.phone = "Enter a Cameroon number, e.g. 6 77 12 34 56";
    if (needsTerms && !agreed) next.terms = "You must accept the Terms and Privacy notice to continue";
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
      toast.success("Profile saved");
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : "We couldn't save your profile. Try again." });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="My profile" subtitle="Your details are shared with providers when you book them." />
      <div className="two-col">
        <form className="card card-pad stack" onSubmit={submit} noValidate aria-label="Profile">
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <div className="form-grid">
            <TextField className="span-2" label="Full name" autoComplete="name" value={form.full_name} error={errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <TextField label="Phone number" type="tel" placeholder="+237 6XX XXX XXX" autoComplete="tel" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-grid"><LocationPicker level="quartier" value={form} errors={errors} onChange={(v) => setForm({ ...form, ...v })} /></div>
          <TextField label="Email" value={session?.email ?? ""} disabled readOnly hint="Your email is optional and can't be changed here." />
          <ImagePicker label="Profile photo" file={photo} onChange={setPhoto}
            hint={profile?.profile_image_key ? "A photo is saved. Choose a new one to replace it." : "JPEG, PNG or WEBP, up to 10 MB."} />
          {needsTerms && <TermsCheckbox checked={agreed} error={errors.terms} onChange={setAgreed} />}
          <div className="row" style={{ justifyContent: "flex-end" }}><Button type="submit" loading={busy}>Save changes</Button></div>
        </form>
        <aside className="card card-pad stack-sm" style={{ justifyItems: "start" }}>
          <Avatar name={profile?.full_name} src={ownPhoto} size={72} />
          <strong>{profile?.full_name}</strong>
          <span className="muted small">{session?.email || formatCmPhone(session?.phone ?? "")}</span>
          {profile?.created_at && <span className="muted xs">Member since {formatDate(profile.created_at)}</span>}
        </aside>
      </div>
    </>
  );
}
