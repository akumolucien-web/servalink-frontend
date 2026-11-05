import { useLang, useT, type Lang } from "../i18n/I18nProvider";

export const OPTIONS: { code: Lang; label: string; name: string }[] = [
  { code: "fr", label: "FR", name: "Français" },
  { code: "en", label: "EN", name: "English" },
];

/** FR | EN toggle used by every layout. Names are in their own language so they stay readable after a wrong switch. */
export function LanguageSwitch() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.label")}>
      {OPTIONS.map(({ code, label, name }) => (
        <button key={code} type="button" lang={code} aria-label={name} aria-pressed={lang === code}
          className={lang === code ? "active" : undefined} onClick={() => void setLang(code)}>{label}</button>
      ))}
    </div>
  );
}
