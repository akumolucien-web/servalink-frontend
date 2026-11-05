import { Link } from "react-router-dom";
import { MessageSquareText } from "lucide-react";
import { api } from "../../api";
import { ButtonLink } from "../../components/ui/Button";
import { Avatar, CardSkeleton, EmptyState, ErrorState, PageHeader, RatingChip } from "../../components/ui/Display";
import { useT } from "../../i18n/I18nProvider";
import { formatDate } from "../../lib/format";
import { useResource } from "../../lib/useResource";

export function ReviewsPage() {
  const t = useT();
  const reviews = useResource(() => api.myReviews(), []);
  const bookings = useResource(() => api.bookings("citizen"), []);
  const byId = new Map((bookings.data ?? []).map((b) => [b.booking_id, b]));
  const toReview = (bookings.data ?? []).filter((b) => b.status === "COMPLETED" && !b.reviewed);

  return (
    <div className="stack-lg">
      <PageHeader title={t("rvs.title")} subtitle={t("rvs.sub")} />

      {toReview.length > 0 && (
        <section className="card" aria-label={t("rvs.waiting")}>
          <div className="card-head"><h3>{t("rvs.waiting")}</h3></div>
          {toReview.map((b) => (
            <div className="service-row" key={b.booking_id}>
              <div><strong>{b.provider_name}</strong><p className="muted small">{b.category_name} · {b.reference}</p></div>
              <ButtonLink size="sm" to={`/app/bookings/${b.booking_id}/review`}>{t("dash.writeReview")}</ButtonLink>
            </div>
          ))}
        </section>
      )}

      <section aria-label={t("rvs.yours")}>
        {reviews.loading && !reviews.data ? <CardSkeleton rows={2} />
          : reviews.error ? <ErrorState error={reviews.error} onRetry={reviews.reload} title={t("rvs.error")} />
            : reviews.data!.length === 0 ? (
              <div className="card"><EmptyState icon={<MessageSquareText size={24} />} title={t("common.noReviews")}
                action={<ButtonLink to="/app/bookings" variant="secondary">{t("rvs.goToBookings")}</ButtonLink>}>
                {t("rvs.noneText")}
              </EmptyState></div>
            ) : (
              <div className="stack">
                {reviews.data!.map((review) => {
                  const booking = byId.get(review.booking_id);
                  return (
                    <article className="card card-pad stack-sm" key={review.review_id}>
                      <div className="row-between">
                        <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
                          <Avatar name={booking?.provider_name} size={40} />
                          <div>
                            <Link to={`/providers/${review.provider_id}`} style={{ fontWeight: 600 }}>{booking?.provider_name ?? t("f.provider")}</Link>
                            <div className="muted xs">{booking ? `${booking.reference} · ` : ""}{formatDate(review.created_at)}</div>
                          </div>
                        </div>
                        <RatingChip rating={review.rating} />
                      </div>
                      <p>{review.comment}</p>
                      {review.photo_url && <img className="proof" src={review.photo_url} alt={t("rvs.photoAlt")} style={{ width: 160, height: 110, objectFit: "cover", borderRadius: 10 }} />}
                    </article>
                  );
                })}
              </div>
            )}
      </section>
    </div>
  );
}
