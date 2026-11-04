import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SearchX } from "lucide-react";
import { api } from "../../api";
import { ProviderCard } from "../../components/domain/Provider";
import { Button, ButtonLink } from "../../components/ui/Button";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { SelectField } from "../../components/ui/Field";
import { plural } from "../../lib/format";
import { regionOfCity } from "../../lib/locations";
import { ratingRank } from "../../lib/status";
import { useResource } from "../../lib/useResource";

type Sort = "rating" | "reviews" | "name";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const city = params.get("city") ?? "";
  const [sort, setSort] = useState<Sort>("rating");
  const [draftCategory, setDraftCategory] = useState(category);
  // Old links carry only ?city=; find its region in the dataset so the picker can show it.
  const region = params.get("region") ?? regionOfCity(city);
  const [draftLoc, setDraftLoc] = useState({ region, city, quartier: "" });
  useEffect(() => { setDraftCategory(category); setDraftLoc({ region, city, quartier: "" }); }, [category, region, city]);

  const categories = useResource(() => api.categories(), []);
  const results = useResource(() => api.providers({ category, city }), [category, city]);

  const sorted = useMemo(() => {
    const list = [...(results.data ?? [])];
    list.sort((a, b) =>
      sort === "name" ? (a.service_title || a.name).localeCompare(b.service_title || b.name)
        : sort === "reviews" ? b.review_count - a.review_count
          : ratingRank(b.overall_rating) - ratingRank(a.overall_rating) || b.review_count - a.review_count);
    return list;
  }, [results.data, sort]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (draftCategory) next.set("category", draftCategory);
    if (draftLoc.region) next.set("region", draftLoc.region);
    if (draftLoc.city) next.set("city", draftLoc.city);
    setParams(next);
  };

  const title = category && city ? `${category} services in ${city}` : category ? `${category} services` : city ? `Services in ${city}` : "Find a service";
  return (
    <>
      <PageHeader title={title}
        subtitle={results.data ? `${plural(results.data.length, "provider")} found` : "Search approved providers by category and town."} />
      <form className="card filter-bar" onSubmit={submit} aria-label="Search filters">
        <SelectField label="Service category" value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)}>
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => <option key={c.category_id} value={c.category_name}>{c.category_name}</option>)}
        </SelectField>
        <LocationPicker level="city" value={draftLoc} onChange={setDraftLoc} />
        <div style={{ alignSelf: "end" }}><Button type="submit" icon={<Search size={16} />} block>Search</Button></div>
      </form>

      <div className="results-head">
        <span className="muted small" aria-live="polite">{results.loading ? "Searching…" : ""}</span>
        <div style={{ width: 220 }}>
          <SelectField label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="rating">Rating</option>
            <option value="reviews">Most reviews</option>
            <option value="name">Name (A to Z)</option>
          </SelectField>
        </div>
      </div>

      {results.loading && !results.data ? <CardSkeleton rows={3} />
        : results.error ? <ErrorState error={results.error} onRetry={results.reload} title="We couldn't load providers" />
          : sorted.length === 0 ? (
            <div className="card">
              <EmptyState icon={<SearchX size={24} />} title="No providers found"
                action={(category || city) ? <ButtonLink to="/search" variant="secondary">Clear filters</ButtonLink> : undefined}>
                {category || city
                  ? "Try another town or category. New providers join as they're approved."
                  : "No approved providers are listed yet. Check back soon."}
              </EmptyState>
            </div>
          ) : (
            <div className="stack">{sorted.map((p) => <ProviderCard key={p.provider_id} provider={p} />)}</div>
          )}

      <p className="muted small" style={{ marginTop: 28 }}>
        Offer a service in your town? <Link to="/become-provider">Become a provider</Link>
      </p>
    </>
  );
}
