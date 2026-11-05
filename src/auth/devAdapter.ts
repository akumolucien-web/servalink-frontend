// LOCAL INTEGRATION ONLY. Loaded via dynamic import behind `isLocalIntegration`
// (Vite dev server, --mode integration), so it is absent from production bundles.
// It talks to servalink-backend/local_dev, a simulated Cognito + API Gateway.
import { config } from "../config/env";
import { AuthError, friendlyAuthError, type AuthAdapter, type AuthSession } from "./adapter";

const KEY = "servalink.dev.session";

// The simulator (servalink-backend/local_dev) keys users by an e-mail-shaped string, so a phone
// number maps to "+237XXXXXXXXX@phone.local". The simulator sends no SMS; the code is always 123456.
const SUFFIX = "@phone.local";
export const devKey = (phone: string) => `${phone}${SUFFIX}`;
const phoneOf = (key: string) => (key.endsWith(SUFFIX) ? key.slice(0, -SUFFIX.length) : "");

interface Stored { idToken: string; refreshToken: string; sub: string; email: string; groups: string[] }

function read(): Stored | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

async function call<T>(action: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/__dev/auth/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  } catch {
    throw friendlyAuthError("NetworkError");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw friendlyAuthError(data.code ?? "Error", data.message);
  return data as T;
}

function tokenExpiry(token: string): number {
  try {
    const raw = token.slice("local.".length).replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(raw + "=".repeat((4 - (raw.length % 4)) % 4))).exp ?? 0) * 1000;
  } catch { return 0; }
}

export function createDevAdapter(): AuthAdapter {
  return {
    async getSession(forceRefresh = false) {
      let stored = read();
      if (!stored) return null;
      if (forceRefresh || tokenExpiry(stored.idToken) - Date.now() < 60_000) {
        try {
          stored = await call<Stored>("refresh", { refreshToken: stored.refreshToken });
          localStorage.setItem(KEY, JSON.stringify(stored));
        } catch (error) {
          if (error instanceof AuthError && error.code === "NotAuthorizedException") localStorage.removeItem(KEY);
          return null;
        }
      }
      const phone = phoneOf(stored.email);
      return { idToken: stored.idToken, sub: stored.sub, phone, email: phone ? "" : stored.email, groups: stored.groups } satisfies AuthSession;
    },
    async signIn(username, password) {
      const session = await call<Stored>("signin", { email: devKey(username), password });
      localStorage.setItem(KEY, JSON.stringify(session));
    },
    async signUp({ phone, password }) { await call("signup", { email: devKey(phone), password }); },
    async confirmSignUp(username, code) { await call("confirm", { email: devKey(username), code: code.trim() }); },
    async resendCode(username) { await call("resend", { email: devKey(username) }); },
    async signOut() { localStorage.removeItem(KEY); },
    async forgotPassword(username) { await call("forgot", { email: devKey(username) }); },
    async confirmForgotPassword(username, code, newPassword) {
      await call("reset", { email: devKey(username), code: code.trim(), password: newPassword });
    },
  };
}
