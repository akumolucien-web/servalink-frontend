import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SearchX } from "lucide-react";
import { api } from "../../api";
import { ProviderCard } from "../../components/domain/Provider";
import { Button, ButtonLink } from "../../components/ui/Button";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { SelectField } from "../../components/ui/Field";
import { useLang, useT } from "../../i18n/I18nProvider";
import { categoryLabel } from "../../lib/format";
import { regionOfCity } from "../../lib/locations";
import { ratingRank } from "../../lib/status";
import { useResource } from "../../lib/useResource";

type Sort = "rating" | "reviews" | "name";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const t = useT();
  const { lang } = useLang();
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

  // The URL carries the English category_name; show its French name when there is one.
  const known = (categories.data ?? []).find((c) => c.category_name === category);
  const shownCategory = known ? categoryLabel(known, lang) : category;
  const title = category && city ? t("search.titleBoth", { category: shownCategory, city }) : category ? t("search.titleCategory", { category: shownCategory }) : city ? t("search.titleCity", { city }) : t("nav.findService");
  return (
    <>
      <PageHeader title={title}
        subtitle={results.data ? t(results.data.length === 1 ? "search.found.one" : "search.found.other", { n: results.data.length }) : t("search.subtitle")} />
      <form className="card filter-bar" onSubmit={submit} aria-label={t("search.filters")}>
        <SelectField label={t("home.category")} value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)}>
          <option value="">{t("search.allCategories")}</option>
          {(categories.data ?? []).map((c) => <option key={c.category_id} value={c.category_name}>{categoryLabel(c, lang)}</option>)}
        </SelectField>
        <LocationPicker level="city" value={draftLoc} onChange={setDraftLoc} />
        <div style={{ alignSelf: "end" }}><Button type="submit" icon={<Search size={16} />} block>{t("search.button")}</Button></div>
      </form>

      <div className="results-head">
        <span className="muted small" aria-live="polite">{results.loading ? t("search.searching") : ""}</span>
        <div style={{ width: 220 }}>
          <SelectField label={t("search.sortBy")} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="rating">{t("search.sortRating")}</option>
            <option value="reviews">{t("search.sortReviews")}</option>
            <option value="name">{t("search.sortName")}</option>
          </SelectField>
        </div>
      </div>

      {results.loading && !results.data ? <CardSkeleton rows={3} />
        : results.error ? <ErrorState error={results.error} onRetry={results.reload} title={t("search.error")} />
          : sorted.length === 0 ? (
            <div className="card">
              <EmptyState icon={<SearchX size={24} />} title={t("search.emptyTitle")}
                action={(category || city) ? <ButtonLink to="/search" variant="secondary">{t("search.clear")}</ButtonLink> : undefined}>
                {category || city
                  ? t("search.emptyFiltered")
                  : t("search.emptyAll")}
              </EmptyState>
            </div>
          ) : (
            <div className="stack">{sorted.map((p) => <ProviderCard key={p.provider_id} provider={p} />)}</div>
          )}

      <p className="muted small" style={{ marginTop: 28 }}>
        {t("search.offer")} <Link to="/become-provider">{t("search.becomeProvider")}</Link>
      </p>
    </>
  );
}
