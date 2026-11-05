import { Bullets, LegalDoc } from "../../components/domain/Legal";
import { useT } from "../../i18n/I18nProvider";

export function PrivacyPage() {
  const t = useT();
  return (
    <LegalDoc title={t("legal.privacy")} sections={[
      [t("privacy.s1.h"), <Bullets items={[t("privacy.s1.b1"), t("privacy.s1.b2"), t("privacy.s1.b3"), t("privacy.s1.b4"), t("privacy.s1.b5")]} />],
      [t("privacy.s2.h"), <Bullets items={[t("privacy.s2.b1"), t("privacy.s2.b2"), t("privacy.s2.b3"), t("privacy.s2.b4"), t("privacy.s2.b5")]} />],
      [t("privacy.s3.h"), <p>{t("privacy.s3.p")}</p>],
      [t("privacy.s4.h"), <p>{t("privacy.s4.p")}</p>],
      [t("privacy.s5.h"), <p>{t("privacy.s5.p")}</p>],
      [t("privacy.s6.h"), <><p>{t("privacy.s6.p")}</p><Bullets items={[t("privacy.s6.b1"), t("privacy.s6.b2"), t("privacy.s6.b3")]} /></>],
      [t("privacy.s7.h"), <p>{t("privacy.s7.p")}</p>],
      [t("privacy.s8.h"), <p>{t("privacy.s8.p")}</p>],
    ]} />
  );
}
