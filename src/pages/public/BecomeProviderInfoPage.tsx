import { BadgeCheck, ClipboardCheck, Inbox, UserPlus } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ButtonLink } from "../../components/ui/Button";
import { useT } from "../../i18n/I18nProvider";

const STEPS: { icon: typeof UserPlus; n: 1 | 2 | 3 | 4 }[] = [
  { icon: UserPlus, n: 1 },
  { icon: ClipboardCheck, n: 2 },
  { icon: BadgeCheck, n: 3 },
  { icon: Inbox, n: 4 },
];

export function BecomeProviderInfoPage() {
  const { status } = useAuth();
  const t = useT();
  return (
    <div className="section" style={{ paddingTop: 48 }}>
      <div className="section-head">
        <h1>{t("bp.title")}</h1>
        <p>{t("bp.sub")}</p>
      </div>
      <div className="stack">
        {STEPS.map(({ icon: Icon, n }) => (
          <div className="card card-pad row" style={{ gap: 16, flexWrap: "nowrap", alignItems: "flex-start" }} key={n}>
            <span className="ico ico-green" style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", flex: "none" }}><Icon size={22} aria-hidden="true" /></span>
            <div><h3 style={{ fontSize: "1.0625rem" }}>{n}. {t(`bp.step${n}.title` as const)}</h3><p className="muted small">{t(`bp.step${n}.text` as const)}</p></div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 28 }}>
        {status === "authenticated"
          ? <ButtonLink to="/app/become-provider" size="lg">{t("bp.start")}</ButtonLink>
          : <>
            <ButtonLink to="/register" size="lg">{t("bp.create")}</ButtonLink>
            <ButtonLink to="/login?next=/app/become-provider" variant="secondary" size="lg">{t("bp.haveAccount")}</ButtonLink>
          </>}
      </div>
    </div>
  );
}
