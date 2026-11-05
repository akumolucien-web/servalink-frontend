// Registration details collected before SMS verification; saved on the first login (PUT /profile needs a token).
// Keyed by the E.164 phone number, which is also the Cognito username.
export interface PendingProfile { phone: string; full_name: string; region: string; city: string }
const PENDING_KEY = "servalink.pendingProfile";

export function rememberPendingProfile(profile: PendingProfile) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
}

export function takePendingProfile(phone: string): PendingProfile | null {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as PendingProfile | null;
    return phone && value && value.phone === phone ? value : null;
  } catch { return null; }
}
