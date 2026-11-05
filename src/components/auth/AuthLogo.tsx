import { useT } from "../../i18n/I18nProvider";

/** ServaLink wordmark for the authentication screens: green house mark, charcoal "Serva", green "Link". */
export function AuthLogo({ compact = false }: { compact?: boolean }) {
  const t = useT();
  return (
    <span className={`auth-logo-mark${compact ? " compact" : ""}`}>
      <svg viewBox="0 0 76 66" width={compact ? 44 : 62} height={compact ? 38 : 54} fill="none" aria-hidden="true" focusable="false">
        <path d="M5 31 36 7l31 24" stroke="var(--green-700)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 27v24h44V27" stroke="var(--green-700)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="27" y="30" width="8" height="8" rx="1.5" fill="var(--green-700)" />
        <rect x="38" y="30" width="8" height="8" rx="1.5" fill="var(--green-700)" />
        <rect x="27" y="41" width="8" height="8" rx="1.5" fill="var(--green-700)" />
        <rect x="38" y="41" width="8" height="8" rx="1.5" fill="var(--green-700)" />
        <path d="M3 58c22-9 46-10 70-4" stroke="var(--green-500)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="auth-logo-text">
        <span className="auth-logo-name"><span>Serva</span><span className="g">Link</span></span>
        {!compact && <span className="auth-logo-tag">{t("brand.tagline")}</span>}
      </span>
    </span>
  );
}
