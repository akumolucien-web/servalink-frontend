import { useState } from "react";
import { useParams } from "react-router-dom";
import { Images, MapPin, MessageSquareText, UserX, Wrench } from "lucide-react";
import { api, ApiError } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { ReviewItem, ServicePrice } from "../../components/domain/Provider";
import { ButtonLink } from "../../components/ui/Button";
import { Avatar, Breadcrumbs, CardSkeleton, EmptyState, ErrorState, RatingChip, StatusBadge } from "../../components/ui/Display";
import { Tabs } from "../../components/ui/Tabs";
import { plural } from "../../lib/format";
import { useResource } from "../../lib/useResource";

type Tab = "services" | "reviews" | "gallery";

export function ProviderProfilePage() {
  const { id = "" } = useParams();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("services");
  const provider = useResource(() => api.provider(id), [id]);
  const reviews = useResource(() => api.providerReviews(id), [id]);
  const gallery = useResource(() => api.providerGallery(id), [id]);

  if (provider.loading && !provider.data) return <CardSkeleton rows={3} />;
  if (provider.error) {
    const notFound = provider.error instanceof ApiError && provider.error.status === 404;
    return notFound ? (
      <div className="card">
        <EmptyState icon={<UserX size={24} />} title="This provider isn't available"
          action={<ButtonLink to="/search" variant="secondary">Back to search</ButtonLink>}>
          The profile doesn't exist, or the provider isn't currently active on ServaLink.
        </EmptyState>
      </div>
    ) : <ErrorState error={provider.error} onRetry={provider.reload} />;
  }
  const p = provider.data!;
  const isOwn = session?.sub === p.provider_id;

  return (
    <>
      <Breadcrumbs items={[{ label: "Find a service", to: "/search" }, { label: p.service_title || p.name }]} />
      <section className="card profile-head" aria-label="Provider summary">
        <Avatar name={p.name} src={p.photo_url} size={96} />
        <div className="stack-sm">
          <div>
            <h1 style={{ fontSize: "1.5rem" }}>{p.service_title || p.name}</h1>
            <p className="muted">{p.name} · {p.category}</p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <RatingChip rating={p.overall_rating} />
            <span className="muted small">{p.review_count > 0 ? plural(p.review_count, "review") : "No reviews yet"}</span>
            {p.bad_review_count > 0 && <span className="muted small">· {p.bad_review_count} rated Bad</span>}
            <span className="muted small row" style={{ gap: 4 }}><MapPin size={14} aria-hidden="true" />{p.city}</span>
          </div>
        </div>
        {isOwn && <div className="go"><StatusBadge label="This is your profile" tone="slate" dot={false} /></div>}
      </section>

      {p.description && (
        <section className="card card-pad stack-sm" style={{ marginTop: 16 }} aria-label="About">
          <h2 style={{ fontSize: "1.0625rem" }}>About</h2>
          <p style={{ whiteSpace: "pre-line" }}>{p.description}</p>
        </section>
      )}

      <div style={{ marginTop: 24 }} className="stack">
        <Tabs label="Provider details" value={tab} onChange={setTab} tabs={[
          { id: "services", label: "Services", count: p.services.length },
          { id: "reviews", label: "Reviews", count: reviews.data?.length },
          { id: "gallery", label: "Work gallery", count: gallery.data?.length },
        ]} />

        {tab === "services" && (
          <div className="card" role="tabpanel">
            {p.services.length === 0 ? (
              <EmptyState icon={<Wrench size={24} />} title="No services listed yet">This provider hasn't added a bookable service. Check back soon.</EmptyState>
            ) : p.services.map((service) => (
              <div className="service-row" key={service.service_id}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <h3 style={{ fontSize: "1rem" }}>{service.name}</h3>
                  {service.description && <p className="muted small">{service.description}</p>}
                  <p className="muted xs row" style={{ gap: 4, marginTop: 4 }}><MapPin size={12} aria-hidden="true" />{service.city}</p>
                  <ServicePrice service={service} />
                </div>
                {isOwn
                  ? <StatusBadge label="Your service" tone="slate" dot={false} />
                  : <ButtonLink to={`/app/book/${service.service_id}`}>Book this service</ButtonLink>}
              </div>
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="card card-pad" role="tabpanel">
            {reviews.loading && !reviews.data ? <CardSkeleton rows={2} />
              : reviews.error ? <ErrorState error={reviews.error} onRetry={reviews.reload} />
                : reviews.data!.length === 0 ? (
                  <EmptyState icon={<MessageSquareText size={24} />} title="No reviews yet">Reviews appear here after customers complete a booking with this provider.</EmptyState>
                ) : reviews.data!.map((review) => <ReviewItem key={review.review_id} review={review} />)}
          </div>
        )}

        {tab === "gallery" && (
          <div role="tabpanel">
            {gallery.loading && !gallery.data ? <CardSkeleton rows={1} />
              : gallery.error ? <ErrorState error={gallery.error} onRetry={gallery.reload} />
                : gallery.data!.length === 0 ? (
                  <div className="card"><EmptyState icon={<Images size={24} />} title="No work photos yet">This provider hasn't shared photos of completed work.</EmptyState></div>
                ) : (
                  <div className="gallery-grid">
                    {gallery.data!.map((item) => (
                      <figure key={item.gallery_item_id} className="gallery-item" style={{ margin: 0 }}>
                        {item.photo_url && <a href={item.photo_url} target="_blank" rel="noreferrer"><img src={item.photo_url} alt={item.caption || "Example of completed work"} loading="lazy" /></a>}
                        {item.caption && <figcaption>{item.caption}</figcaption>}
                      </figure>
                    ))}
                  </div>
                )}
          </div>
        )}
      </div>
    </>
  );
}
