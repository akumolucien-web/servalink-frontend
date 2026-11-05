import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarCheck, CheckCircle2, Flag, Images, Search, ShieldCheck, Tags, UserSearch } from "lucide-react";
import { api } from "../../api";
import paintingPhoto from "../../assets/auth-painter.webp";
import { CategoryIcon } from "../../components/domain/CategoryIcon";
import { FeaturedProviders } from "../../components/home/FeaturedProviders";
import { Button, ButtonLink } from "../../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Display";
import { LocationPicker } from "../../components/domain/LocationPicker";
import { SelectField } from "../../components/ui/Field";
import { useLang, useT, type Key } from "../../i18n/I18nProvider";
import { categoryLabel } from "../../lib/format";
import { useResource } from "../../lib/useResource";

const STEPS: { icon: typeof Search; n: number }[] = [
  { icon: Search, n: 1 },
  { icon: UserSearch, n: 2 },
  { icon: CalendarCheck, n: 3 },
  { icon: CheckCircle2, n: 4 },
];

const BENEFITS: { icon: typeof Search; n: number }[] = [
  { icon: Tags, n: 1 },
  { icon: Images, n: 2 },
  { icon: CalendarCheck, n: 3 },
  { icon: ShieldCheck, n: 4 },
  { icon: Flag, n: 5 },
];

const FAQ = [1, 2, 3, 4, 5] as const;

export function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const categories = useResource(() => api.categories(), []);
  const [category, setCategory] = useState("");
  const [loc, setLoc] = useState({ region: "", city: "", quartier: "" });
  const [errors, setErrors] = useState<{ category?: string; region?: string; city?: string }>({});
  const list = categories.data ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      category: category ? undefined : t("home.errCategory"),
      region: loc.region ? undefined : t("home.errRegion"),
      city: loc.city ? undefined : t("home.errCity"),
    };
    setErrors(next);
    if (next.category || next.region || next.city) return;
    navigate(`/search?category=${encodeURIComponent(category)}&region=${encodeURIComponent(loc.region)}&city=${encodeURIComponent(loc.city)}`);
  };

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-copy">
          <h1 id="hero-title">{t("home.heroTitle")}</h1>
          <p className="lead">{t("home.heroLead")}</p>
          <form className="home-search" onSubmit={submit} noValidate aria-label={t("home.searchAria")}>
            <SelectField label={t("home.category")} value={category} error={errors.category}
              onChange={(e) => setCategory(e.target.value)} disabled={categories.loading || !list.length}>
              <option value="">{categories.loading ? t("home.loadingCategories") : list.length ? t("home.chooseCategory") : t("home.noCategoriesShort")}</option>
              {list.map((c) => <option key={c.category_id} value={c.category_name}>{categoryLabel(c, lang)}</option>)}
            </SelectField>
            <LocationPicker level="city" value={loc} onChange={setLoc} errors={errors} />
            <Button type="submit" size="lg" icon={<Search size={18} />}>{t("home.findProviders")}</Button>
          </form>
          <p className="small muted">{t("home.free")}</p>
        </div>
        <div className="home-hero-photo">
          <img src={paintingPhoto} alt={t("home.heroAlt")} fetchPriority="high" width={1448} height={1086} />
        </div>
      </section>

      <section className="home-band" aria-labelledby="cats-title">
        <div className="home-wrap">
          <div className="home-head row-between">
            <div>
              <h2 id="cats-title">{t("home.popularTitle")}</h2>
              <p>{t("home.popularSub")}</p>
            </div>
            <Link to="/search" className="small nowrap">{t("common.browseAll")}</Link>
          </div>
          {categories.loading && !categories.data ? (
            <div className="home-cat-grid" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={132} radius={16} />)}</div>
          ) : categories.error ? (
            <div className="card"><ErrorState error={categories.error} onRetry={categories.reload} title={t("home.categoriesError")} /></div>
          ) : list.length === 0 ? (
            <div className="card"><EmptyState icon={<Tags size={24} />} title={t("home.noCategoriesTitle")}>{t("home.noCategoriesText")}</EmptyState></div>
          ) : (
            <ul className="home-cat-grid">
              {list.map((c) => (
                <li key={c.category_id}>
                  <Link className="home-cat" to={`/search?category=${encodeURIComponent(c.category_name)}`}>
                    <span className="ci"><CategoryIcon name={c.category_name} size={26} /></span>
                    <span className="name">{categoryLabel(c, lang)}</span>
                    <span className="go small">{t("home.findProvidersLink")} <ArrowRight size={14} aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <FeaturedProviders />

      <section className="home-band home-band-warm" id="how-it-works" aria-labelledby="how-title">
        <div className="home-wrap">
          <div className="home-head">
            <h2 id="how-title">{t("home.howTitle")}</h2>
            <p>{t("home.howSub")}</p>
          </div>
          <ol className="home-steps">
            {STEPS.map(({ icon: Icon, n }) => (
              <li key={n} className="home-step">
                <span className="num" aria-hidden="true">{n}</span>
                <span className="ico"><Icon size={22} aria-hidden="true" /></span>
                <h3>{t(`home.step${n}.title` as Key)}</h3>
                <p className="muted small">{t(`home.step${n}.text` as Key)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-band" id="about" aria-labelledby="why-title">
        <div className="home-wrap">
          <div className="home-head">
            <h2 id="why-title">{t("home.whyTitle")}</h2>
            <p>{t("home.whySub")}</p>
          </div>
          <ul className="home-benefits">
            {BENEFITS.map(({ icon: Icon, n }) => (
              <li key={n} className="home-benefit">
                <span className="ico"><Icon size={22} aria-hidden="true" /></span>
                <div><h3>{t(`home.benefit${n}.title` as Key)}</h3><p className="muted small">{t(`home.benefit${n}.text` as Key)}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-wrap home-cta-wrap" aria-labelledby="cta-title">
        <div className="home-cta">
          <div>
            <h2 id="cta-title">{t("home.ctaTitle")}</h2>
            <p>{t("home.ctaText")}</p>
            <p className="small">{t("home.ctaNote")}</p>
          </div>
          <ButtonLink to="/become-provider" variant="light" size="lg" icon={<BadgeCheck size={18} />}>{t("common.becomeProvider")}</ButtonLink>
        </div>
      </section>

      <section className="home-band home-band-sage" id="faq" aria-labelledby="faq-title">
        <div className="home-wrap home-faq-wrap">
          <div className="home-head">
            <h2 id="faq-title">{t("home.faqTitle")}</h2>
          </div>
          <div className="home-faq">
            {FAQ.map((n) => (
              <details key={n}>
                <summary>{t(`home.faq${n}.q` as Key)}</summary>
                <p>{t(`home.faq${n}.a` as Key)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
