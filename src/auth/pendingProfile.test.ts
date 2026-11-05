import { beforeEach, describe, expect, it } from "vitest";
import { rememberPendingProfile, takePendingProfile } from "./pendingProfile";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe("pending profile (keyed by phone)", () => {
  const profile = { phone: "+237677123456", full_name: "Lucien Fon", region: "SW", city: "Buea" };

  it("returns the saved profile for the same phone", () => {
    rememberPendingProfile(profile);
    expect(takePendingProfile("+237677123456")).toEqual(profile);
  });
  it("ignores another phone, an empty phone, and nothing saved", () => {
    expect(takePendingProfile("+237677123456")).toBeNull();
    rememberPendingProfile(profile);
    expect(takePendingProfile("+237650000000")).toBeNull();
    expect(takePendingProfile("")).toBeNull();
  });
});
