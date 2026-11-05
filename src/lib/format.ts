import { getLang, translate, type Lang } from "../i18n/core";
import type { Category } from "../api/types";

const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
};

/** ISO timestamp from the backend (UTC) shown in the viewer's locale. */
export function formatDateTime(iso?: string, lang: Lang = getLang()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[lang][date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDate(iso?: string, lang: Lang = getLang()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[lang][date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * booking_date is an opaque local datetime string "YYYY-MM-DDTHH:mm" chosen by the
 * citizen. It is formatted from its parts, never through Date, so no timezone shift.
 */
export function formatBookingDate(value?: string, lang: Lang = getLang()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return value ?? "";
  const [, y, m, d, hh, mm] = match;
  return `${Number(d)} ${MONTHS[lang][Number(m) - 1]} ${y}, ${hh}:${mm}`;
}

/** Value for <input type="datetime-local"> min: now, in local time, rounded up to the next hour. */
export function nextHourLocal(from = new Date()): string {
  const date = new Date(from.getTime());
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name?: string): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function greeting(now = new Date(), lang: Lang = getLang()): string {
  const hour = now.getHours();
  return translate(lang, hour < 12 ? "greet.morning" : hour < 18 ? "greet.afternoon" : "greet.evening");
}

/** "Good morning, Awa!" / "Bonjour, Awa !"; just the greeting when there is no first name. */
export function greetingTitle(fullName?: string, lang: Lang = getLang(), now = new Date()): string {
  const text = greeting(now, lang);
  const name = firstName(fullName);
  return name ? translate(lang, "greet.hello", { greeting: text, name }) : translate(lang, "greet.helloAnon", { greeting: text });
}

/** Category name to show: the French name when the language is French and the record has one. Search still sends category_name. */
export function categoryLabel(category: Pick<Category, "category_name" | "category_name_fr">, lang: Lang = getLang()): string {
  return (lang === "fr" && category.category_name_fr?.trim()) || category.category_name;
}

/** "5 000 FCFA"; a regular space separator (toLocaleString varies by browser). No price means "Price on request" / "Sur devis". */
export function formatFcfa(n?: number | null): string {
  if (n == null) return translate(getLang(), "common.priceOnRequest");
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+$)/g, " ")} FCFA`;
}
