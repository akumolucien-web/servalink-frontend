import { Bullets, LegalDoc } from "../../components/domain/Legal";
import { useT } from "../../i18n/I18nProvider";

export function TermsPage() {
  const t = useT();
  return (
    <LegalDoc title={t("legal.terms")} sections={[
      [t("terms.s1.h"), <p>{t("terms.s1.p")}</p>],
      [t("terms.s2.h"), <p>{t("terms.s2.p")}</p>],
      [t("terms.s3.h"), <p>{t("terms.s3.p")}</p>],
      [t("terms.s4.h"), <Bullets items={[t("terms.s4.b1"), t("terms.s4.b2"), t("terms.s4.b3")]} />],
      [t("terms.s5.h"), <>
        <p>{t("terms.s5.p")}</p>
        <Bullets items={[t("terms.s5.b1"), t("terms.s5.b2"), t("terms.s5.b3"), t("terms.s5.b4")]} />
      </>],
      [t("terms.s6.h"), <p>{t("terms.s6.p")}</p>],
      [t("terms.s7.h"), <p>{t("terms.s7.p")}</p>],
      [t("terms.s8.h"), <p>{t("terms.s8.p")}</p>],
      [t("terms.s9.h"), <p>{t("terms.s9.p")}</p>],
      [t("terms.s10.h"), <p>{t("terms.s10.p")}</p>],
      [t("terms.s11.h"), <p>{t("terms.s11.p")}</p>],
      [t("terms.s12.h"), <p>{t("terms.s12.p")}</p>],
      [t("terms.s13.h"), <p>{t("terms.s13.p")}</p>],
    ]} />
  );
}
