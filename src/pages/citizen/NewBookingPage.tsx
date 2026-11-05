import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, UserX } from "lucide-react";
import { api, ApiError } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { BackLink } from "../../components/domain/Provider";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Avatar, Banner, CardSkeleton, EmptyState, ErrorState, PageHeader, RatingChip } from "../../components/ui/Display";
import { SelectField, TextAreaField, TextField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { useT } from "../../i18n/I18nProvider";
import { nextHourLocal } from "../../lib/format";
import { fold, quartiersOf } from "../../lib/locations";
import { useResource } from "../../lib/useResource";

const OTHER = "__other__";

export function NewBookingPage() {
  const { serviceId = "" } = useParams();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const toast = useToast();
  const service = useResource(() => api.service(serviceId), [serviceId]);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  // undefined = not touched yet: fall back to the profile quartier (resolved below, once the service city is known).
  const [pickedQuartier, setQuartier] = useState<string>();
  const [typing, setTyping] = useState(false);
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ date?: string; message?: string; quartier?: string; address?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (service.loading && !service.data) return <CardSkeleton rows={2} />;
  if (service.error) {
    const missing = service.error instanceof ApiError && service.error.status === 404;
    return missing ? (
      <div className="card"><EmptyState icon={<UserX size={24} />} title={t("nb.unavailable")}
        action={<ButtonLink to="/search" variant="secondary">{t("nb.findAnother")}</ButtonLink>}>
        {t("nb.removed")}
      </EmptyState></div>
    ) : <ErrorState error={service.error} onRetry={service.reload} />;
  }
  const s = service.data!;
  const own = s.provider_id === session?.sub;
  const min = nextHourLocal();
  const quartiers = quartiersOf(s.region, s.city);
  const sameCity = !!profile?.city && fold(profile.city) === fold(s.city);
  const quartier = pickedQuartier ?? (sameCity ? profile?.quartier ?? "" : "");
  const known = quartiers.find((q) => fold(q) === fold(quartier));
  const other = typing || (!!quartier && !known);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!date) next.date = t("nb.errDate");
    else if (date < min) next.date = t("nb.errDatePast");
    if (message.trim().length < 10) next.message = t("nb.errMessage");
    if (!quartier.trim()) next.quartier = t("nb.errQuartier");
    if (address.trim().length < 5) next.address = t("nb.errAddress");
    setErrors(next);
    if (next.date || next.message || next.quartier || next.address) return;
    setBusy(true);
    try {
      const booking = await api.createBooking({ service_id: s.service_id, booking_date: date, message: message.trim(), quartier: quartier.trim(), address_details: address.trim() });
      toast.success(t("nb.sent"));
      navigate(`/app/bookings/${booking.booking_id}`, { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("nb.failed") });
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to={`/providers/${s.provider_id}`}>{t("nb.back")}</BackLink>
      <PageHeader title={t("nb.title")} subtitle={t("nb.sub")} />
      <div className="two-col">
        <form className="card card-pad stack" onSubmit={submit} noValidate aria-label={t("nb.formAria")}>
          {own && <Banner tone="warning">{t("nb.own")}</Banner>}
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <TextField label={t("nb.date")} type="datetime-local" min={min} value={date} error={errors.date}
            hint={t("nb.dateHint")} onChange={(e) => { setDate(e.target.value); setErrors((er) => ({ ...er, date: undefined })); }} disabled={own} />
          <TextAreaField label={t("nb.job")} value={message} error={errors.message} maxLength={1000}
            placeholder={t("nb.jobPlaceholder")}
            onChange={(e) => { setMessage(e.target.value); setErrors((er) => ({ ...er, message: undefined })); }} disabled={own} />
          <SelectField label={t("loc.quartier")} value={other ? OTHER : known ?? ""} error={errors.quartier} disabled={own}
            onChange={(e) => {
              const v = e.target.value;
              setTyping(v === OTHER); setQuartier(v === OTHER ? "" : v);
              setErrors((er) => ({ ...er, quartier: undefined }));
            }}>
            <option value="">{t("loc.selectQuartier")}</option>
            {quartiers.map((q) => <option key={q} value={q}>{q}</option>)}
            <option value={OTHER}>{t("loc.other")}</option>
          </SelectField>
          {other && (
            <TextField label={t("loc.yourQuartier")} value={quartier} maxLength={100} error={errors.quartier} disabled={own}
              onChange={(e) => { setTyping(true); setQuartier(e.target.value); setErrors((er) => ({ ...er, quartier: undefined })); }} />
          )}
          <TextAreaField label={t("nb.address")} value={address} error={errors.address} maxLength={300} disabled={own}
            placeholder={t("nb.addressPlaceholder")}
            hint={t("nb.addressHint")}
            onChange={(e) => { setAddress(e.target.value); setErrors((er) => ({ ...er, address: undefined })); }} />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <ButtonLink variant="ghost" to={`/providers/${s.provider_id}`}>{t("common.cancel")}</ButtonLink>
            <Button type="submit" loading={busy} disabled={own}>{t("nb.send")}</Button>
          </div>
        </form>
        <aside className="card card-pad stack-sm" aria-label={t("nb.summary")}>
          <h3 style={{ fontSize: "1rem" }}>{s.name}</h3>
          {s.description && <p className="muted small">{s.description}</p>}
          <p className="muted small row" style={{ gap: 4 }}><MapPin size={14} aria-hidden="true" />{s.city} · {s.category_name}</p>
          <hr className="divider" />
          <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
            <Avatar name={s.provider_name} src={s.provider_photo_url} size={44} />
            <div><div style={{ fontWeight: 600 }}>{s.provider_name}</div><RatingChip rating={s.overall_rating} /></div>
          </div>
          <p className="hint-box">{t("nb.noPayment")}</p>
        </aside>
      </div>
    </>
  );
}
