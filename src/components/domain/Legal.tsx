import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useT } from "../../i18n/I18nProvider";
import { Banner } from "../ui/Display";

export const LEGAL_VERSION = "2026-11-04";

export function LegalDoc({ title, sections }: { title: string; sections: [heading: string, body: ReactNode][] }) {
  const t = useT();
  return (
    <article className="section legal-doc" style={{ paddingTop: 48, maxWidth: 760 }}>
      <Banner tone="warning">{t("legal.draft")}</Banner>
      <h1 style={{ marginTop: 20 }}>{title}</h1>
      <p className="muted small">{t("legal.version", { version: LEGAL_VERSION })}</p>
      {sections.map(([heading, body], i) => (
        <section key={heading} className="stack-sm" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1.25rem" }}>{i + 1}. {heading}</h2>
          {body}
        </section>
      ))}
    </article>
  );
}

export const Bullets = ({ items }: { items: string[] }) => <ul style={{ paddingLeft: 20 }}>{items.map((t) => <li key={t}>{t}</li>)}</ul>;

/** "Terms and Privacy notice" links that open in a new tab. */
export function LegalLinks({ terms, privacy }: { terms?: string; privacy?: string }) {
  const t = useT();
  return <><Link to="/terms" target="_blank" rel="noopener">{terms ?? t("legal.terms")}</Link>{t("legal.and")}<Link to="/privacy" target="_blank" rel="noopener">{privacy ?? t("legal.privacy")}</Link></>;
}

export function TermsCheckbox({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  const t = useT();
  return (
    <div className="stack-sm">
      <label className="check">
        <input type="checkbox" checked={checked} aria-invalid={!!error || undefined} onChange={(e) => onChange(e.target.checked)} />
        <span>{t("legal.agree")}<LegalLinks /></span>
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
