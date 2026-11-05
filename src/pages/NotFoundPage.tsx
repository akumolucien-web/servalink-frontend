import { Compass } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/Display";
import { useT } from "../i18n/I18nProvider";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="card" style={{ maxWidth: 560, margin: "48px auto" }}>
      <EmptyState icon={<Compass size={24} />} title={t("nf.title")}
        action={<ButtonLink to="/">{t("nf.home")}</ButtonLink>}>
        {t("nf.text")}
      </EmptyState>
    </div>
  );
}
