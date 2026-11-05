import { en } from "./en";
import { fr } from "./fr";

export type Lang = "fr" | "en";
export type Key = keyof typeof en;
export type Vars = Record<string, string | number>;

export const LANG_STORAGE_KEY = "servalink.lang";
const dictionaries: Record<Lang, Record<Key, string>> = { en, fr };

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const text = dictionaries[lang][key] || en[key] || key;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;
}

/** Stored choice wins; otherwise French unless the browser language is English. */
export function detectLang(stored: string | null | undefined, navigatorLanguage: string | undefined): Lang {
  if (stored === "fr" || stored === "en") return stored;
  return navigatorLanguage?.toLowerCase().startsWith("en") ? "en" : "fr";
}

const readStored = (): string | null => {
  try { return localStorage.getItem(LANG_STORAGE_KEY); } catch { return null; }
};
export const hasStoredLang = () => { const v = readStored(); return v === "fr" || v === "en"; };

// Module-level current language so non-React helpers (date formats, API/auth error text) follow the switch.
// Without a browser (unit tests) it stays English.
let current: Lang = typeof window === "undefined" ? "en" : detectLang(readStored(), navigator.language);
if (typeof document !== "undefined") document.documentElement.lang = current;

export const getLang = (): Lang => current;

export function applyLang(lang: Lang): void {
  current = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* private mode: the choice lasts for this visit */ }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

/** Profile-creation bodies carry the language in use, so the backend default (fr) never overrides an English browser. */
export const withLang = <T extends object>(body: T): T & { language: Lang } => ({ ...body, language: current });
