import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type Profile, type ProviderRecord } from "../api";
import { configureClient } from "../api/client";
import { isLocalIntegration } from "../config/env";
import type { AuthAdapter, AuthSession } from "./adapter";
import { createAmplifyAdapter } from "./amplifyAdapter";
import { takePendingProfile } from "./pendingProfile";
import { withLang } from "../i18n/core";
import { formatCmPhone } from "../lib/phone";

type Status = "loading" | "anonymous" | "authenticated";

interface AuthValue {
  status: Status;
  session: AuthSession | null;
  /** undefined: not loaded (or admin-only); null: signed in but no application profile yet. */
  profile: Profile | null | undefined;
  provider: ProviderRecord | null;
  accountLoading: boolean;
  isAdmin: boolean;
  /** PROVIDER group in the token AND an APPROVED provider record. */
  hasProviderTools: boolean;
  /** Approved by Admin but the current token predates the PROVIDER group. */
  needsSessionRefresh: boolean;
  sessionExpired: boolean;
  displayName: string;
  adapter: AuthAdapter | null;
  signIn: (username: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-issues the token so new Cognito groups apply, then reloads the account. */
  refreshSession: () => Promise<boolean>;
  reloadAccount: () => Promise<void>;
  saveProfile: (body: Parameters<typeof api.saveProfile>[0]) => Promise<Profile>;
}

const Context = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [adapter, setAdapter] = useState<AuthAdapter | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const adapterRef = useRef<AuthAdapter | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;

  const isAdmin = !!session?.groups.includes("ADMIN");

  const loadAccount = useCallback(async (current: AuthSession) => {
    if (current.groups.includes("ADMIN")) {
      setProfile(undefined); setProvider(null); return current;
    }
    setAccountLoading(true);
    try {
      const [loadedProfile, loadedProvider] = await Promise.all([api.profile(), api.myProvider()]);
      let finalProfile = loadedProfile;
      if (!finalProfile) {
        // Registration data collected before SMS verification is saved on first login.
        const pending = takePendingProfile(current.phone);
        if (pending) {
          try {
            finalProfile = await api.saveProfile(withLang({ full_name: pending.full_name, region: pending.region, city: pending.city, accept_terms: true })); // consent line shown under "Create Account"
          } catch { finalProfile = null; }
        }
      }
      setProfile(finalProfile);
      setProvider(loadedProvider);
      // Approved by Admin but this token has no PROVIDER group yet: refresh it once automatically.
      if (loadedProvider?.status === "APPROVED" && !current.groups.includes("PROVIDER") && adapterRef.current) {
        const flag = `servalink.autorefresh.${current.sub}`;
        let tried = false;
        try { tried = sessionStorage.getItem(flag) === "1"; sessionStorage.setItem(flag, "1"); } catch { /* ignore */ }
        if (!tried) {
          const fresh = await adapterRef.current.getSession(true);
          if (fresh) { setSession(fresh); return fresh; }
        }
      }
    } catch {
      /* Pages surface their own errors; keep the session. */
    } finally {
      setAccountLoading(false);
    }
    return current;
  }, []);

  // Boot: choose the adapter (simulated auth only in local integration), restore the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let chosen: AuthAdapter;
      if (isLocalIntegration) {
        const { createDevAdapter } = await import("./devAdapter");
        chosen = createDevAdapter();
      } else {
        chosen = createAmplifyAdapter();
      }
      adapterRef.current = chosen;
      setAdapter(chosen);
      configureClient({
        getToken: async () => (await chosen.getSession())?.idToken ?? null,
        onUnauthorized: () => {
          if (!sessionRef.current) return;
          void chosen.signOut();
          setSession(null); setProfile(undefined); setProvider(null);
          setSessionExpired(true); setStatus("anonymous");
        },
      });
      const existing = await chosen.getSession();
      if (cancelled) return;
      if (existing) {
        setSession(existing);
        setStatus("authenticated");
        setSession(await loadAccount(existing));
      } else {
        setStatus("anonymous");
      }
    })();
    return () => { cancelled = true; };
  }, [loadAccount]);

  // A pending applicant who returns to the tab may have been approved meanwhile.
  useEffect(() => {
    if (provider?.status !== "PENDING") return;
    const check = () => { if (document.visibilityState === "visible") void api.myProvider().then(setProvider).catch(() => {}); };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [provider?.status]);

  const signIn = useCallback(async (username: string, password: string, remember: boolean) => {
    const current = adapterRef.current!;
    await current.signIn(username, password, remember);
    const fresh = await current.getSession();
    if (!fresh) throw new Error("Sign-in did not return a session.");
    setSessionExpired(false);
    setStatus("authenticated");
    setSession(fresh);
    setSession(await loadAccount(fresh));
  }, [loadAccount]);

  const signOut = useCallback(async () => {
    await adapterRef.current?.signOut();
    setSession(null); setProfile(undefined); setProvider(null); setSessionExpired(false);
    setStatus("anonymous");
  }, []);

  const refreshSession = useCallback(async () => {
    const fresh = await adapterRef.current?.getSession(true);
    if (!fresh) return false;
    setSession(fresh);
    await loadAccount(fresh);
    return fresh.groups.includes("PROVIDER");
  }, [loadAccount]);

  const reloadAccount = useCallback(async () => {
    if (sessionRef.current) await loadAccount(sessionRef.current);
  }, [loadAccount]);

  const saveProfile = useCallback(async (body: Parameters<typeof api.saveProfile>[0]) => {
    const saved = await api.saveProfile(body);
    setProfile(saved);
    return saved;
  }, []);

  const value = useMemo<AuthValue>(() => {
    const hasGroup = !!session?.groups.includes("PROVIDER");
    return {
      status, session, profile, provider, accountLoading, isAdmin, adapter, sessionExpired,
      hasProviderTools: hasGroup && provider?.status === "APPROVED",
      needsSessionRefresh: provider?.status === "APPROVED" && !hasGroup,
      displayName: profile?.full_name || (isAdmin ? "Admin" : session?.email || formatCmPhone(session?.phone ?? "")),
      signIn, signOut, refreshSession, reloadAccount, saveProfile,
    };
  }, [status, session, profile, provider, accountLoading, isAdmin, adapter, sessionExpired, signIn, signOut, refreshSession, reloadAccount, saveProfile]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
