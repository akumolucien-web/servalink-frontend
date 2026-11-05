import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { applyLang, getLang, hasStoredLang, translate, type Key, type Lang, type Vars } from "./core";

export type { Lang, Key };

interface I18nValue { lang: Lang; setLang: (lang: Lang) => void }
const Context = createContext<I18nValue | null>(null);

/** Provides the active language. Must sit inside AuthProvider: a signed-in user's choice is saved to their profile. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { profile, saveProfile } = useAuth();
  const [lang, setLangState] = useState<Lang>(getLang);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const setLang = useCallback((next: Lang) => {
    applyLang(next);
    setLangState(next);
    const current = profileRef.current;
    // PUT /profile needs the full profile; skip legacy records that have no region yet.
    if (current && current.region && current.language !== next) {
      void saveProfile({
        full_name: current.full_name, region: current.region, city: current.city, phone: current.phone,
        quartier: current.quartier ?? "", language: next,
      }).catch(() => { console.warn("Could not save the language to the profile; kept on this device."); });
    }
  }, [saveProfile]);

  // A user who has never picked a language on this device gets the one saved on their profile.
  const savedLanguage = profile?.language;
  useEffect(() => {
    if (savedLanguage && !hasStoredLang()) { applyLang(savedLanguage); setLangState(savedLanguage); }
  }, [savedLanguage]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLang(): I18nValue {
  const value = useContext(Context);
  if (!value) throw new Error("useLang must be used inside I18nProvider");
  return value;
}

/** t(key, vars?) in the active language; the function changes identity when the language does. */
export function useT(): (key: Key, vars?: Vars) => string {
  const { lang } = useLang();
  return useCallback((key: Key, vars?: Vars) => translate(lang, key, vars), [lang]);
}
