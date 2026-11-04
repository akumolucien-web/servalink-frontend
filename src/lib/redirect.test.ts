import { describe, expect, it } from "vitest";
import { landingAfterLogin, safeNext, withNext } from "./redirect";

describe("landingAfterLogin (role-aware destination)", () => {
  it("never sends a non-admin into the admin area (e.g. ?next= left by an admin's logout)", () => {
    for (const next of ["/admin", "/admin/providers/p1", "/admin?x=1"]) {
      expect(landingAfterLogin(next, false)).toBe("/app");
    }
    expect(landingAfterLogin("/administrator-guide", false)).toBe("/administrator-guide");
  });

  it("keeps admin links for admins and app links for citizens", () => {
    expect(landingAfterLogin("/admin/reports/r1", true)).toBe("/admin/reports/r1");
    expect(landingAfterLogin("/app/bookings/b1", false)).toBe("/app/bookings/b1");
    expect(landingAfterLogin(null, true)).toBe("/admin");
    expect(landingAfterLogin("https://evil.test", false)).toBe("/app");
  });
});

describe("safeNext (post-login destination)", () => {
  it.each([
    "/app/bookings/b1", "/admin/providers/p1", "/admin/reports/r%2F1", "/app/reports/r1?x=1",
  ])("keeps the app path %s", (path) => expect(safeNext(path, "/app")).toBe(path));

  it.each([
    "//evil.test", "//evil.test/app", "/\\evil.test", "https://evil.test", "http://evil.test/app", "javascript:alert(1)",
    "evil.test", "", null, undefined, "/app\nSet-Cookie: x", "/\t/evil.test", "///evil.test",
  ])("rejects %s", (value) => expect(safeNext(value as string | null | undefined, "/app")).toBe("/app"));

  it("never redirects to an auth page (would loop)", () => {
    for (const path of ["/login", "/login?next=/app", "/register", "/verify?email=a", "/forgot-password"]) {
      expect(safeNext(path, "/app")).toBe("/app");
    }
    expect(safeNext("/loginfo", "/app")).toBe("/loginfo");
  });

  it("withNext adds only safe destinations", () => {
    expect(withNext("/verify?email=a%40b.test", "/app/bookings/b1")).toBe("/verify?email=a%40b.test&next=%2Fapp%2Fbookings%2Fb1");
    expect(withNext("/login", "https://evil.test")).toBe("/login");
    expect(withNext("/login", null)).toBe("/login");
  });
});
