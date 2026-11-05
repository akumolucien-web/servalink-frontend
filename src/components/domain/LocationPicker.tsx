import { useState } from "react";
import { SelectField, TextField, type Errors } from "../ui/Field";
import { useLang, useT } from "../../i18n/I18nProvider";
import { citiesOf, fold, quartiersOf, regionName, REGIONS } from "../../lib/locations";

export interface LocationValue { region: string; city: string; quartier: string }
const OTHER = "__other__";

/** Region -> city -> (optional) quartier. Changing a level clears the levels below it. */
export function LocationPicker({ value, onChange, level, errors = {}, disabled }: {
  value: LocationValue; onChange: (v: LocationValue) => void; level: "quartier" | "city";
  errors?: Errors<"region" | "city" | "quartier">; disabled?: boolean;
}) {
  const t = useT();
  const { lang } = useLang();
  const quartiers = quartiersOf(value.region, value.city);
  const known = quartiers.some((q) => fold(q) === fold(value.quartier));
  const [typing, setTyping] = useState(false);
  const other = typing || (!!value.quartier && !known);
  return (
    <>
      <SelectField label={t("loc.region")} value={value.region} error={errors.region} disabled={disabled}
        onChange={(e) => { setTyping(false); onChange({ region: e.target.value, city: "", quartier: "" }); }}>
        <option value="">{t("loc.selectRegion")}</option>
        {REGIONS.map((r) => <option key={r.id} value={r.id}>{regionName(r.id, lang)}</option>)}
      </SelectField>
      {value.region && (
        <SelectField label={t("loc.city")} value={value.city} error={errors.city} disabled={disabled}
          onChange={(e) => { setTyping(false); onChange({ ...value, city: e.target.value, quartier: "" }); }}>
          <option value="">{t("loc.selectCity")}</option>
          {citiesOf(value.region).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </SelectField>
      )}
      {level === "quartier" && value.region && value.city && (
        <>
          <SelectField label={t("loc.quartier")} value={other ? OTHER : known ? quartiers.find((q) => fold(q) === fold(value.quartier)) : ""}
            error={errors.quartier} disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              setTyping(v === OTHER);
              onChange({ ...value, quartier: v === OTHER ? "" : v });
            }}>
            <option value="">{t("loc.selectQuartier")}</option>
            {quartiers.map((q) => <option key={q} value={q}>{q}</option>)}
            <option value={OTHER}>{t("loc.other")}</option>
          </SelectField>
          {other && (
            <TextField label={t("loc.yourQuartier")} value={value.quartier} maxLength={100} disabled={disabled}
              onChange={(e) => onChange({ ...value, quartier: e.target.value })} />
          )}
        </>
      )}
    </>
  );
}
