import { useState, type FormEvent } from "react";
import { MapPin, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { api, ApiError, type Service } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { ServicePrice } from "../../components/domain/Provider";
import { Button } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { hasErrors, SelectField, TextAreaField, TextField, type Errors } from "../../components/ui/Field";
import { Modal, useConfirm, useToast } from "../../components/ui/Overlay";
import { useLang, useT } from "../../i18n/I18nProvider";
import { categoryLabel } from "../../lib/format";
import { regionOfCity } from "../../lib/locations";
import { useResource } from "../../lib/useResource";
import { CategoryRequestModal } from "../citizen/BecomeProviderPage";

export function ProviderServicesPage() {
  const { session } = useAuth();
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const services = useResource(() => api.myServices(session!.sub), [session?.sub]);
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  const remove = async (service: Service) => {
    const ok = await confirm({
      title: t("ps.deleteTitle"), confirmLabel: t("ps.deleteConfirm"), tone: "danger",
      message: t("ps.deleteMsg", { name: service.name }),
    });
    if (!ok) return;
    try { await api.deleteService(service.service_id); toast.success(t("ps.deleted")); }
    catch (error) { toast.error(error instanceof ApiError ? error.message : t("ps.deleteFailed")); }
    await services.reload();
  };

  return (
    <>
      <PageHeader title={t("ps.title")} subtitle={t("ps.sub")}
        actions={<Button icon={<Plus size={16} />} onClick={() => setEditing("new")}>{t("ps.add")}</Button>} />
      {services.loading && !services.data ? <CardSkeleton rows={2} />
        : services.error ? <ErrorState error={services.error} onRetry={services.reload} title={t("ps.error")} />
          : services.data!.length === 0 ? (
            <div className="card"><EmptyState icon={<Wrench size={24} />} title={t("ps.none")}
              action={<Button onClick={() => setEditing("new")}>{t("pd.addFirst")}</Button>}>
              {t("ps.noneText")}
            </EmptyState></div>
          ) : (
            <div className="card">
              {services.data!.map((s) => (
                <div className="service-row" key={s.service_id}>
                  <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                    <h3 style={{ fontSize: "1rem" }}>{s.name}</h3>
                    {s.description && <p className="muted small">{s.description}</p>}
                    <p className="muted xs row" style={{ gap: 4, marginTop: 4 }}><MapPin size={12} aria-hidden="true" />{s.city} · {s.category_name}</p>
                    <ServicePrice service={s} />
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => setEditing(s)}>{t("ps.edit")}</Button>
                    <Button size="sm" variant="danger-outline" icon={<Trash2 size={14} />} onClick={() => remove(s)}>{t("ps.delete")}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
      <ServiceModal target={editing} onClose={() => setEditing(null)} onSaved={services.reload} />
    </>
  );
}

function ServiceModal({ target, onClose, onSaved }: { target: Service | "new" | null; onClose: () => void; onSaved: () => void }) {
  const { profile, provider } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const categories = useResource(() => api.categories(), []);
  const isNew = target === "new";
  const existing = target && target !== "new" ? target : null;
  const [form, setForm] = useState({ category_id: "", name: "", description: "", price_from: "", price_note: "" });
  const [loc, setLoc] = useState({ region: "", city: "", quartier: "" });
  const [loadedFor, setLoadedFor] = useState<unknown>(null);
  const [errors, setErrors] = useState<Errors<"category_id" | "region" | "city" | "name" | "price_from" | "form">>({});
  const [busy, setBusy] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Reset the form each time the modal opens for a different target.
  if (target !== loadedFor) {
    setLoadedFor(target);
    setErrors({});
    const price = { price_from: existing?.price_from != null ? String(existing.price_from) : "", price_note: existing?.price_note ?? "" };
    setForm(existing
      ? { category_id: existing.category_id, name: existing.name, description: existing.description ?? "", ...price }
      : { category_id: "", name: "", description: "", ...price });
    // New services default to the provider's profile region and city.
    const city = provider?.city ?? profile?.city ?? "";
    setLoc({ region: profile?.region || regionOfCity(city), city, quartier: "" });
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (isNew && !form.category_id) next.category_id = t("home.chooseCategory");
    if (isNew && !loc.region) next.region = t("home.errRegion");
    if (isNew && !loc.city) next.city = t("ps.errTown");
    if (!form.name.trim()) next.name = t("ps.errName");
    const priceText = form.price_from.trim();
    const price = priceText ? Number(priceText) : null;
    if (price !== null && !(Number.isInteger(price) && price >= 100 && price <= 10_000_000)) next.price_from = t("ps.errPrice");
    setErrors(next);
    if (hasErrors(next)) return;
    setBusy(true);
    try {
      const body = { name: form.name.trim(), description: form.description.trim(), price_from: price, price_note: form.price_note.trim() };
      if (existing) await api.updateService(existing.service_id, body);
      else await api.createService({ category_id: form.category_id, region: loc.region, city: loc.city, ...body });
      toast.success(t(existing ? "ps.updated" : "ps.addedToast"));
      onSaved(); onClose();
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("ps.saveFailed") });
    } finally { setBusy(false); }
  };

  return (
    <>
      <Modal open={!!target} title={t(existing ? "ps.editTitle" : "ps.add")} onClose={onClose}>
        <form onSubmit={submit} noValidate>
          <div className="modal-body form stack">
            {errors.form && <Banner tone="danger">{errors.form}</Banner>}
            {isNew && (
              <>
                <SelectField label={t("f.category")} value={form.category_id} error={errors.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">{t("home.chooseCategory")}</option>
                  {(categories.data ?? []).map((c) => <option key={c.category_id} value={c.category_id}>{categoryLabel(c, lang)}</option>)}
                </SelectField>
                <p className="small" style={{ marginTop: -8 }}>{t("ps.missing")} <button type="button" style={{ background: "none", border: 0, padding: 0, color: "var(--green-700)", fontWeight: 600, textDecoration: "underline" }} onClick={() => setRequesting(true)}>{t("ps.requestOne")}</button></p>
                <LocationPicker level="city" value={loc} onChange={setLoc} errors={errors} />
              </>
            )}
            {existing && <p className="hint-box">{t("ps.locked", { category: existing.category_name, city: existing.city })}</p>}
            <TextField label={t("ps.name")} placeholder={t("ps.namePlaceholder")} value={form.name} error={errors.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextAreaField label={t("f.description")} optional value={form.description} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label={t("ps.price")} optional type="number" inputMode="numeric" min={100} max={10000000} step={1} value={form.price_from} error={errors.price_from}
              hint={t("ps.priceHint")} onChange={(e) => setForm({ ...form, price_from: e.target.value })} />
            <TextField label={t("ps.priceNote")} optional value={form.price_note} maxLength={120} placeholder={t("ps.priceNotePlaceholder")} onChange={(e) => setForm({ ...form, price_note: e.target.value })} />
          </div>
          <div className="modal-foot"><Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t(existing ? "common.save" : "ps.addSubmit")}</Button></div>
        </form>
      </Modal>
      <CategoryRequestModal open={requesting} onClose={() => setRequesting(false)} onDone={() => {}} />
    </>
  );
}
