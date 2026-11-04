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
import { useResource } from "../../lib/useResource";

const STEPS = [
  { icon: Search, title: "Search for a Service", text: "Choose a service category and your city." },
  { icon: UserSearch, title: "Explore Providers", text: "View profiles and examples of completed work." },
  { icon: CalendarCheck, title: "Request a Booking", text: "Send a booking request and follow its progress." },
  { icon: CheckCircle2, title: "Confirm Completion", text: "Confirm completed work and share your experience." },
];

const BENEFITS = [
  { icon: Tags, title: "Search by category and city", text: "Find approved providers for the service you need, in your own town." },
  { icon: Images, title: "Profiles and work galleries", text: "See what a provider offers, what customers say and photos of their work." },
  { icon: CalendarCheck, title: "Manage your bookings", text: "Send requests, and follow each booking from request to completion in one place." },
  { icon: ShieldCheck, title: "Reviews after the work is done", text: "You confirm the work is complete before you can leave a review, so reviews come from real bookings." },
  { icon: Flag, title: "Report a problem", text: "If something goes wrong with a booking, report it and an administrator reviews it." },
];

const FAQ = [
  { q: "How do I find a Provider?", a: "Choose a service category and your town or city on this page, then open a provider's profile to see their services, customer reviews and photos of their work. You can browse without an account." },
  { q: "How do I request a booking?", a: "Log in or create an account, open a provider's profile and choose Book this service. Pick a date and describe the job. The provider accepts or declines your request, and you can follow its progress under My Bookings." },
  { q: "How do I become a Provider?", a: "Use your existing ServaLink account and apply with your service category, a title and a short description. An administrator reviews every application. Once you are approved you can list your services and receive booking requests." },
  { q: "When can I leave a review?", a: "After the provider marks the work as finished and you confirm it is complete. Each review is tied to that booking and is marked as a verified booking." },
  { q: "What happens if I have a problem with a booking?", a: "Open the booking and choose Report a problem. An administrator reviews the report and you see the outcome in your account. A report does not change the booking's status." },
];

export function HomePage() {
  const navigate = useNavigate();
  const categories = useResource(() => api.categories(), []);
  const [category, setCategory] = useState("");
  const [loc, setLoc] = useState({ region: "", city: "", quartier: "" });
  const [errors, setErrors] = useState<{ category?: string; region?: string; city?: string }>({});
  const list = categories.data ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      category: category ? undefined : "Choose a category",
      region: loc.region ? undefined : "Choose a region",
      city: loc.city ? undefined : "Choose your town or city",
    };
    setErrors(next);
    if (next.category || next.region || next.city) return;
    navigate(`/search?category=${encodeURIComponent(category)}&region=${encodeURIComponent(loc.region)}&city=${encodeURIComponent(loc.city)}`);
  };

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-copy">
          <h1 id="hero-title">Find the Right Professional for Every Job.</h1>
          <p className="lead">Discover skilled local service providers in your city, explore their work, and book services with confidence.</p>
          <form className="home-search" onSubmit={submit} noValidate aria-label="Search for a service">
            <SelectField label="Service category" value={category} error={errors.category}
              onChange={(e) => setCategory(e.target.value)} disabled={categories.loading || !list.length}>
              <option value="">{categories.loading ? "Loading categories…" : list.length ? "Choose a category" : "No categories yet"}</option>
              {list.map((c) => <option key={c.category_id} value={c.category_name}>{c.category_name}</option>)}
            </SelectField>
            <LocationPicker level="city" value={loc} onChange={setLoc} errors={errors} />
            <Button type="submit" size="lg" icon={<Search size={18} />}>Find Providers</Button>
          </form>
          <p className="small muted">Free to use. ServaLink does not process payments.</p>
        </div>
        <div className="home-hero-photo">
          <img src={paintingPhoto} alt="A painter rolling green paint onto the wall of a house" fetchPriority="high" width={1448} height={1086} />
        </div>
      </section>

      <section className="home-band" aria-labelledby="cats-title">
        <div className="home-wrap">
          <div className="home-head row-between">
            <div>
              <h2 id="cats-title">Popular Services</h2>
              <p>Choose a category to see the providers offering it.</p>
            </div>
            <Link to="/search" className="small nowrap">Browse all providers</Link>
          </div>
          {categories.loading && !categories.data ? (
            <div className="home-cat-grid" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={132} radius={16} />)}</div>
          ) : categories.error ? (
            <div className="card"><ErrorState error={categories.error} onRetry={categories.reload} title="We couldn't load service categories" /></div>
          ) : list.length === 0 ? (
            <div className="card"><EmptyState icon={<Tags size={24} />} title="No service categories yet">Categories appear here as soon as they are added.</EmptyState></div>
          ) : (
            <ul className="home-cat-grid">
              {list.map((c) => (
                <li key={c.category_id}>
                  <Link className="home-cat" to={`/search?category=${encodeURIComponent(c.category_name)}`}>
                    <span className="ci"><CategoryIcon name={c.category_name} size={26} /></span>
                    <span className="name">{c.category_name}</span>
                    <span className="go small">Find providers <ArrowRight size={14} aria-hidden="true" /></span>
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
            <h2 id="how-title">How ServaLink Works</h2>
            <p>From search to a finished job, with every step recorded on your booking.</p>
          </div>
          <ol className="home-steps">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="home-step">
                <span className="num" aria-hidden="true">{index + 1}</span>
                <span className="ico"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p className="muted small">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-band" id="about" aria-labelledby="why-title">
        <div className="home-wrap">
          <div className="home-head">
            <h2 id="why-title">Why Choose ServaLink?</h2>
            <p>Local services for people in Cameroon, with the tools to book them clearly.</p>
          </div>
          <ul className="home-benefits">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="home-benefit">
                <span className="ico"><Icon size={22} aria-hidden="true" /></span>
                <div><h3>{title}</h3><p className="muted small">{text}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-wrap home-cta-wrap" aria-labelledby="cta-title">
        <div className="home-cta">
          <div>
            <h2 id="cta-title">Your Skills Deserve to Be Discovered.</h2>
            <p>Create your professional profile, showcase your work, and connect with people looking for your services.</p>
            <p className="small">Provider applications are reviewed and approved by an administrator.</p>
          </div>
          <ButtonLink to="/become-provider" variant="light" size="lg" icon={<BadgeCheck size={18} />}>Become a Provider</ButtonLink>
        </div>
      </section>

      <section className="home-band home-band-sage" id="faq" aria-labelledby="faq-title">
        <div className="home-wrap home-faq-wrap">
          <div className="home-head">
            <h2 id="faq-title">Frequently Asked Questions</h2>
          </div>
          <div className="home-faq">
            {FAQ.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
