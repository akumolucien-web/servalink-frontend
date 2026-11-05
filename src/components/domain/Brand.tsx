import { House } from "lucide-react";
import { Link } from "react-router-dom";
import { isLocalIntegration } from "../../config/env";
import { useT } from "../../i18n/I18nProvider";

export function Brand({ to = "/" }: { to?: string }) {
  const t = useT();
  return (
    <Link to={to} className="brand" aria-label={t("brand.home")}>
      <House size={26} strokeWidth={2.2} aria-hidden="true" />
      ServaLink
    </Link>
  );
}

/** Visible only in `vite --mode integration`; never rendered in a production build. */
export function LocalModeBanner() {
  const t = useT();
  if (!isLocalIntegration) return null;
  return <div className="local-banner" role="note">{t("auth.localBanner")}</div>;
}
