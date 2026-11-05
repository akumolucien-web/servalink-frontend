import { getLang, type Lang } from "../i18n/core";

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Allowed job months ("YYYY-MM", comparable as text): this month back to 24 months ago, in UTC like the backend. */
export const jobMonthBounds = (now = new Date()) => ({ min: ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 24, 1))), max: ym(now) });

export function isValidJobMonth(value: string, now = new Date()): boolean {
  const { min, max } = jobMonthBounds(now);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= min && value <= max;
}

/** "2026-03" -> "March 2026" / "mars 2026". */
export function formatJobMonth(value: string, lang: Lang = getLang()): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" });
}
