import { useState, type FormEvent } from "react";
import { Hourglass, RefreshCw, ShieldX } from "lucide-react";
import { api, ApiError, type ProviderRecord } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Banner, EmptyState, PageHeader, StatusBadge } from "../../components/ui/Display";
import { hasErrors, SelectField, TextAreaField, TextField, type Errors } from "../../components/ui/Field";
import { Modal, useToast } from "../../components/ui/Overlay";
import { useLang, useT } from "../../i18n/I18nProvider";
import { categoryLabel, formatDateTime } from "../../lib/format";
import { PROVIDER_STATUS, REQUEST_STATUS } from "../../lib/status";
import { useResource } from "../../lib/useResource";

export function BecomeProviderPage() {
  const { provider, profile, hasProviderTools, needsSessionRefresh, reloadAccount, refreshSession } = useAuth();
  const t = useT();
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  if (provider) {
    const status = PROVIDER_STATUS[provider.status];
    const check = async () => {
      setChecking(true);
      await reloadAccount();
      const ok = await refreshSession();
      setChecking(false);
      toast.success(ok ? t("bpg.approvedToast") : t("bpg.statusUpdated"));
    };
    return (
      <>
        <PageHeader title={t("ws.providerApplication")} subtitle={t("bpg.statusSub")} />
        <div className="stack" style={{ maxWidth: 720 }}>
          {provider.status === "PENDING" && (
            <div className="card"><EmptyState icon={<Hourglass size={24} />} title={t("bpg.pendingTitle")}
              action={<Button variant="secondary" icon={<RefreshCw size={16} />} loading={checking} onClick={check}>{t("bpg.checkStatus")}</Button>}>
              {t("bpg.pendingText")}
            </EmptyState></div>
          )}
          {provider.status === "APPROVED" && (hasProviderTools ? (
            <Banner tone="success" action={<ButtonLink to="/app/provider" size="sm">{t("bpg.openTools")}</ButtonLink>}>
              <strong>{t("bpg.approvedYou")}</strong><span>{t("bpg.approvedManage")}</span>
            </Banner>
          ) : needsSessionRefresh ? (
            <Banner tone="success" action={<Button size="sm" loading={checking} onClick={check}>{t("bpg.refreshAccess")}</Button>}>
              <strong>{t("bpg.approvedApp")}</strong><span>{t("bpg.refreshText")}</span>
            </Banner>
          ) : null)}
          {(provider.status === "REJECTED" || provider.status === "SUSPENDED" || provider.status === "BANNED") && (
            <div className="card"><EmptyState icon={<ShieldX size={24} />} title={t("bpg.statusIs", { status: t(status.label) })}>
              {provider.status_reason ? t("bpg.reason", { reason: provider.status_reason }) : t("bpg.unavailable")}
            </EmptyState></div>
          )}
          <ApplicationSummary provider={provider} />
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader title={t("bp.title")} subtitle={t("bpg.applySub")} />
      <ApplicationForm defaultPhone={profile?.phone ?? ""} city={profile?.city ?? ""} />
    </>
  );
}

function ApplicationSummary({ provider }: { provider: ProviderRecord }) {
  const t = useT();
  const status = PROVIDER_STATUS[provider.status];
  return (
    <section className="card card-pad stack" aria-label={t("bpg.details")}>
      <div className="row-between"><h3 style={{ fontSize: "1rem" }}>{t("bpg.yourApp")}</h3><StatusBadge label={t(status.label)} tone={status.tone} /></div>
      <dl className="kv">
        <dt>{t("f.category")}</dt><dd>{provider.service_category}</dd>
        <dt>{t("f.serviceTitle")}</dt><dd>{provider.service_title}</dd>
        <dt>{t("f.description")}</dt><dd style={{ whiteSpace: "pre-line" }}>{provider.description || t("common.none")}</dd>
        <dt>{t("f.phone")}</dt><dd>{provider.phone || t("common.none")}</dd>
        <dt>{t("loc.city")}</dt><dd>{provider.city}</dd>
        <dt>{t("f.submitted")}</dt><dd>{formatDateTime(provider.created_at)}</dd>
      </dl>
    </section>
  );
}

type Key = "category" | "title" | "description" | "phone" | "form";

function ApplicationForm({ defaultPhone, city }: { defaultPhone: string; city: string }) {
  const { reloadAccount } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const categories = useResource(() => api.categories(), []);
  const requests = useResource(() => api.categoryRequests(), []);
  const [form, setForm] = useState({ category: "", title: "", description: "", phone: defaultPhone });
  const [errors, setErrors] = useState<Errors<Key>>({});
  const [busy, setBusy] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors<Key> = {};
    if (!form.category) next.category = t("bpg.errCategory");
    if (!form.title.trim()) next.title = t("bpg.errTitle");
    if (form.description.trim().length < 20) next.description = t("bpg.errDescription");
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 8) next.phone = t("bpg.errPhone");
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      await api.applyAsProvider({ service_category: form.category, service_title: form.title.trim(), description: form.description.trim(), phone: form.phone.trim() });
      toast.success(t("bpg.submittedToast"));
      await reloadAccount();
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("bpg.submitFailed") });
      setBusy(false);
    }
  };

  const list = categories.data ?? [];
  return (
    <div className="two-col">
      <form className="card card-pad stack" onSubmit={submit} noValidate aria-label={t("ws.providerApplication")}>
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <SelectField label={t("bpg.serviceCategory")} value={form.category} error={errors.category}
          hint={!categories.loading && list.length === 0 ? t("bpg.noCategoriesHint") : undefined}
          onChange={(e) => update("category", e.target.value)} disabled={categories.loading || list.length === 0}>
          <option value="">{categories.loading ? t("home.loadingCategories") : t("home.chooseCategory")}</option>
          {list.map((c) => <option key={c.category_id} value={c.category_name}>{categoryLabel(c, lang)}</option>)}
        </SelectField>
        <p className="small" style={{ marginTop: -8 }}>
          {t("bpg.cantFind")} <button type="button" className="btn-link" style={{ background: "none", border: 0, padding: 0, color: "var(--green-700)", fontWeight: 600, textDecoration: "underline" }} onClick={() => setRequesting(true)}>{t("bpg.requestNew")}</button>
        </p>
        <TextField label={t("f.serviceTitle")} placeholder={t("bpg.titlePlaceholder")} value={form.title} error={errors.title} maxLength={120}
          hint={t("bpg.titleHint")} onChange={(e) => update("title", e.target.value)} />
        <TextAreaField label={t("f.description")} value={form.description} error={errors.description} maxLength={1500}
          placeholder={t("bpg.descPlaceholder")} onChange={(e) => update("description", e.target.value)} />
        <TextField label={t("auth.phone")} optional type="tel" placeholder="+237 6XX XXX XXX" value={form.phone} error={errors.phone} onChange={(e) => update("phone", e.target.value)} />
        <p className="hint-box">{t("bpg.listedPre")}<strong>{city || t("bpg.profileTown")}</strong>{t("bpg.listedPost")}</p>
        <div className="row" style={{ justifyContent: "flex-end" }}><Button type="submit" loading={busy}>{t("bpg.submit")}</Button></div>
      </form>

      <aside className="stack">
        <div className="card card-pad stack-sm">
          <h3 style={{ fontSize: "1rem" }}>{t("bpg.next")}</h3>
          <ol className="small muted" style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 6 }}>
            <li>{t("bpg.next1")}</li>
            <li>{t("bpg.next2")}</li>
            <li>{t("bpg.next3")}</li>
          </ol>
        </div>
        {(requests.data?.length ?? 0) > 0 && (
          <div className="card card-pad stack-sm">
            <h3 style={{ fontSize: "1rem" }}>{t("bpg.yourRequests")}</h3>
            {requests.data!.map((r) => (
              <div className="row-between" key={r.request_id}>
                <span className="small">{r.proposed_name}</span>
                <StatusBadge label={t(REQUEST_STATUS[r.status].label)} tone={REQUEST_STATUS[r.status].tone} />
              </div>
            ))}
            <p className="muted xs">{t("bpg.approvedAppear")}</p>
          </div>
        )}
      </aside>
      <CategoryRequestModal open={requesting} onClose={() => setRequesting(false)} onDone={requests.reload} />
    </div>
  );
}

export function CategoryRequestModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors<"name" | "description" | "form">>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = t("bpg.errCatName");
    if (!description.trim()) next.description = t("bpg.errCatCovers");
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      await api.requestCategory({ proposed_name: name.trim(), description: description.trim() });
      toast.success(t("bpg.catSubmitted"));
      setName(""); setDescription(""); onDone(); onClose();
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("bpg.catFailed") });
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} title={t("bpg.requestNew")} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body form stack">
          <p className="muted small">{t("bpg.catIntro")}</p>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <TextField label={t("bpg.catName")} value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
          <TextAreaField label={t("bpg.catCovers")} value={description} error={errors.description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="modal-foot"><Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("bpg.catSubmit")}</Button></div>
      </form>
    </Modal>
  );
}
