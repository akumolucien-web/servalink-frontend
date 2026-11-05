import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { Rating } from "../../api/types";
import { initials } from "../../lib/format";
import { useT } from "../../i18n/I18nProvider";
import { ratingLabel, type Tone } from "../../lib/status";
import { Button } from "./Button";

export function StatusBadge({ label, tone, dot = true }: { label: string; tone: Tone; dot?: boolean }) {
  return <span className={`badge tone-${tone}`}>{dot && <span className="dot" aria-hidden="true" />}{label}</span>;
}

/** Rating as a word (Bad / Good / V.Good / Excellent; Mauvais / Bien / Très bien / Excellent), never stars or numbers. */
export function RatingChip({ rating }: { rating: Rating | null | undefined }) {
  const t = useT();
  if (!rating) return <span className="rating rating-none">{t("common.noReviews")}</span>;
  return <span className={`rating rating-${rating}`}>{ratingLabel(rating)}</span>;
}

export function Avatar({ name, src, size = 40 }: { name?: string; src?: string | null; size?: number }) {
  const style: CSSProperties = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

export function Skeleton({ height = 16, width = "100%", radius }: { height?: number; width?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useT();
  return (
    <div className="stack" role="status" aria-label={t("common.loading")}>
      {Array.from({ length: rows }, (_, i) => (
        <div className="card card-pad stack-sm" key={i}>
          <Skeleton height={18} width="40%" /><Skeleton height={14} width="75%" /><Skeleton height={14} width="55%" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <div className="state-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title }: { error: Error; onRetry?: () => void; title?: string }) {
  const t = useT();
  return (
    <div className="state error" role="alert">
      <div className="state-icon" aria-hidden="true"><AlertTriangle size={24} /></div>
      <h3>{title ?? t("common.couldntLoad")}</h3>
      <p>{error.message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>{t("common.tryAgain")}</Button>}
    </div>
  );
}

export function Banner({ tone = "info", children, action }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode; action?: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : TriangleAlert;
  return (
    <div className={`banner ${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={18} aria-hidden="true" />
      <div className="grow stack-sm">{children}</div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function StatCard({ value, label, icon, tone = "green", to }: { value: ReactNode; label: string; icon: ReactNode; tone?: "green" | "blue" | "amber" | "red" | "purple"; to?: string }) {
  const body = (
    <>
      <div><div className="num">{value}</div><div className="lbl">{label}</div></div>
      <span className={`ico ico-${tone}`} aria-hidden="true">{icon}</span>
    </>
  );
  return to
    ? <Link className="card stat card-interactive" to={to}>{body}</Link>
    : <div className="card stat">{body}</div>;
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  const t = useT();
  return (
    <nav className="crumbs" aria-label={t("common.breadcrumb")}>
      {items.map((item, i) => (
        <span key={i} className="row" style={{ gap: 8 }}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {i < items.length - 1 && <span aria-hidden="true">/</span>}
        </span>
      ))}
    </nav>
  );
}
