import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ImagePlus, MapPin, X } from "lucide-react";
import { validateImage, type ProviderCard as ProviderCardData, type Review, type Service } from "../../api";
import { useT } from "../../i18n/I18nProvider";
import { formatDate, formatFcfa } from "../../lib/format";
import { Button, ButtonLink } from "../ui/Button";
import { Avatar, RatingChip } from "../ui/Display";

export function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const t = useT();
  return (
    <article className="card card-interactive provider-card" aria-label={provider.service_title || provider.name}>
      <Avatar name={provider.name} src={provider.photo_url} size={72} />
      <div className="stack-sm" style={{ minWidth: 0 }}>
        <div>
          <h3>{provider.service_title || provider.name}</h3>
          <p className="muted small">{provider.name} · {provider.category}</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <RatingChip rating={provider.overall_rating} />
          {provider.review_count > 0 && <span className="muted small">{t(provider.review_count === 1 ? "common.reviews.one" : "common.reviews.other", { n: provider.review_count })}</span>}
          <span className="muted small row" style={{ gap: 4 }}><MapPin size={14} aria-hidden="true" />{provider.city}</span>
        </div>
        {provider.description && <p className="small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{provider.description}</p>}
      </div>
      <div className="go"><ButtonLink to={`/providers/${provider.provider_id}`}>{t("common.viewProfile")}</ButtonLink></div>
    </article>
  );
}

export function ServicePrice({ service }: { service: Pick<Service, "price_from" | "price_note"> }) {
  return (
    <p className="small" style={{ marginTop: 4, fontWeight: 600 }}>
      {formatFcfa(service.price_from)}{service.price_note && <span className="muted" style={{ fontWeight: 400 }}> · {service.price_note}</span>}
    </p>
  );
}

export function ReviewItem({ review }: { review: Review }) {
  const t = useT();
  return (
    <article className="review">
      <div className="row-between">
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={review.reviewer_name} size={36} />
          <div>
            <div style={{ fontWeight: 600 }}>{review.reviewer_name || t("common.customerFallback")}</div>
            <div className="muted xs">{formatDate(review.created_at)}</div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {review.verified_booking && <span className="badge tone-green"><BadgeCheck size={13} aria-hidden="true" />{t("common.verifiedBooking")}</span>}
          <RatingChip rating={review.rating} />
        </div>
      </div>
      <p>{review.comment}</p>
      {review.photo_url && <a href={review.photo_url} target="_blank" rel="noreferrer"><img className="proof" src={review.photo_url} alt={t("common.reviewPhoto")} /></a>}
    </article>
  );
}

/** Optional image picker with preview and client-side type/size validation. The caller uploads on submit. */
export function ImagePicker({ label, file, onChange, optional = true, hint }: {
  label: string; file: File | null; onChange: (file: File | null) => void; optional?: boolean; hint?: string;
}) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}{optional && <span className="optional"> {t("common.optional")}</span>}</label>
      <div className="upload-drop">
        {preview ? <img src={preview} alt={t("image.preview")} /> : <ImagePlus size={28} className="muted" aria-hidden="true" />}
        <div className="grow stack-sm">
          <span className="small">{file ? file.name : hint ?? t("image.hint")}</span>
          <div className="row" style={{ gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>{file ? t("image.change") : t("image.choose")}</Button>
            {file && <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => { onChange(null); setError(undefined); if (input.current) input.current.value = ""; }}>{t("image.remove")}</Button>}
          </div>
        </div>
        <input ref={input} id={id} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            const problem = picked ? validateImage(picked) : null;
            setError(problem ?? undefined);
            onChange(problem ? null : picked);
          }} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: string }) {
  return <Link to={to} className="small" style={{ display: "inline-block", marginBottom: 12 }}>← {children}</Link>;
}
