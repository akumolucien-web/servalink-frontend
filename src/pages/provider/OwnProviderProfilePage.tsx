import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { api, ApiError } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Banner, PageHeader, StatusBadge } from "../../components/ui/Display";
import { TextAreaField, TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { useT } from "../../i18n/I18nProvider";
import { PROVIDER_STATUS, statusOf } from "../../lib/status";

/** Provider Profile (own): only service title and description are editable (PUT /provider). */
export function OwnProviderProfilePage() {
  const { provider, reloadAccount, session } = useAuth();
  const t = useT();
  const toast = useToast();
  const [form, setForm] = useState({ service_title: "", description: "" });
  const [errors, setErrors] = useState<{ title?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (provider) setForm({ service_title: provider.service_title, description: provider.description ?? "" });
  }, [provider]);
  if (!provider) return null;
  const status = statusOf(PROVIDER_STATUS, provider.status);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.service_title.trim()) { setErrors({ title: t("bpg.errTitle") }); return; }
    setErrors({}); setBusy(true);
    try {
      await api.saveProviderProfile({ service_title: form.service_title.trim(), description: form.description.trim() });
      await reloadAccount();
      toast.success(t("opp.saved"));
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("opp.failed") });
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={t("opp.title")} subtitle={t("opp.sub")}
        actions={<ButtonLink variant="secondary" to={`/providers/${session?.sub}`} icon={<ExternalLink size={16} />}>{t("opp.viewPublic")}</ButtonLink>} />
      <div className="two-col">
        <form className="card card-pad stack" onSubmit={submit} noValidate aria-label={t("opp.title")}>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <TextField label={t("f.serviceTitle")} value={form.service_title} error={errors.title} maxLength={120} onChange={(e) => setForm({ ...form, service_title: e.target.value })} />
          <TextAreaField label={t("f.description")} value={form.description} maxLength={1500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="row" style={{ justifyContent: "flex-end" }}><Button type="submit" loading={busy}>{t("common.save")}</Button></div>
        </form>
        <aside className="card card-pad stack-sm">
          <div className="row-between"><h3 style={{ fontSize: "1rem" }}>{t("f.status")}</h3><StatusBadge label={t(status.label)} tone={status.tone} /></div>
          <dl className="kv" style={{ gridTemplateColumns: "100px 1fr" }}>
            <dt>{t("f.category")}</dt><dd>{provider.service_category}</dd>
            <dt>{t("loc.city")}</dt><dd>{provider.city}</dd>
            <dt>{t("f.phone")}</dt><dd>{provider.phone || t("common.none")}</dd>
          </dl>
          <p className="muted xs">{t("opp.note")}</p>
        </aside>
      </div>
    </>
  );
}
