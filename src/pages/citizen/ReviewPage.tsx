import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarX2, CheckCircle2 } from "lucide-react";
import { api, ApiError, uploadImage, type Rating } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { BackLink, ImagePicker } from "../../components/domain/Provider";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { TextAreaField } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Overlay";
import { useLang, useT } from "../../i18n/I18nProvider";
import { ratingLabel, RATING_ORDER } from "../../lib/status";
import { useResource } from "../../lib/useResource";

export function ReviewPage() {
  const { id = "" } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const booking = useResource(() => api.booking(id), [id]);
  const [rating, setRating] = useState<Rating | "">("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (booking.loading && !booking.data) return <CardSkeleton rows={2} />;
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} />;
  const b = booking.data!;
  const back = `/app/bookings/${b.booking_id}`;

  if (b.citizen_id !== session?.sub || b.status !== "COMPLETED" || b.reviewed) {
    const reviewed = b.reviewed;
    return (
      <div className="card"><EmptyState icon={reviewed ? <CheckCircle2 size={24} /> : <CalendarX2 size={24} />}
        title={t(reviewed ? "rv.already" : "rv.cant")}
        action={<ButtonLink to={back} variant="secondary">{t("rp.backToBooking")}</ButtonLink>}>
        {t(reviewed ? "rv.onceText" : "rv.afterConfirm")}
      </EmptyState></div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!rating) next.rating = t("rv.errRating");
    if (!comment.trim()) next.comment = t("rv.errComment");
    setErrors(next);
    if (next.rating || next.comment) return;
    setBusy(true);
    try {
      const photo_key = photo ? await uploadImage(photo, "REVIEW") : undefined;
      await api.createReview({ booking_id: b.booking_id, rating: rating as Rating, comment: comment.trim(), photo_key });
      toast.success(t("rv.submitted"));
      navigate(back, { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t("rv.failed") });
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to={back}>{t("rp.backToBooking")}</BackLink>
      <PageHeader title={t("rv.title", { name: b.provider_name })} subtitle={t("rv.sub", { ref: b.reference })} />
      <form className="card card-pad stack" style={{ maxWidth: 680 }} onSubmit={submit} noValidate aria-label={t("rv.formAria")}>
        {errors.form && <Banner tone="danger">{errors.form}</Banner>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label" style={{ marginBottom: 8 }}>{t("rv.how")}</legend>
          <div className="rating-picker" role="radiogroup" aria-label={t("rv.ratingAria")}>
            {RATING_ORDER.map((value) => (
              <label className="rating-option" key={value}>
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => { setRating(value); setErrors((e) => ({ ...e, rating: undefined })); }} />
                <span>{ratingLabel(value, lang)}</span>
              </label>
            ))}
          </div>
          {errors.rating && <p className="field-error" role="alert" style={{ marginTop: 6 }}>{errors.rating}</p>}
        </fieldset>
        <TextAreaField label={t("rv.yourReview")} value={comment} error={errors.comment} maxLength={1500}
          placeholder={t("rv.placeholder")} onChange={(e) => { setComment(e.target.value); setErrors((er) => ({ ...er, comment: undefined })); }} />
        <ImagePicker label={t("rv.addPhoto")} file={photo} onChange={setPhoto} hint={t("rv.photoHint")} />
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <ButtonLink variant="ghost" to={back}>{t("common.cancel")}</ButtonLink>
          <Button type="submit" loading={busy}>{t("rv.submit")}</Button>
        </div>
      </form>
    </>
  );
}
