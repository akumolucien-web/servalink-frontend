// NOTE: still email-based; needs porting to phone sign-in.
// Opens the notification deep links on the LIVE site as the two live E2E test users (real Cognito login).
// Needs E2E_STATE = path to the JSON written by the live end-to-end run (ids + test-account passwords). Never prints passwords.
import fs from "node:fs";
import { chromium } from "playwright-core";

const SITE = process.env.SITE ?? "https://main.d3t3isz8grbi9v.amplifyapp.com";
const state = JSON.parse(fs.readFileSync(process.env.E2E_STATE, "utf8"));
const USERS = {
  citizen: { email: "servalink-e2e-citizen@example.com", pw: state.pw.citizen },
  provider: { email: "servalink-e2e-provider@example.com", pw: state.pw.provider },
};
const bookingPath = `/app/bookings/${state.booking_id}`;
const reportPath = `/app/reports/${state.report_id}`;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const results = []; const errors = [];

async function check(name, fn) {
  try { await fn(); results.push(true); console.log("  PASS ", name); }
  catch (e) { results.push(false); console.log("  FAIL ", name, "\n        " + String(e.message).split("\n")[0]); }
}
async function openAs(ctx, user, path) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(SITE + path, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login\?next=/, { timeout: 30000 });
  if (decodeURIComponent(new URL(page.url()).searchParams.get("next")) !== path) throw new Error("login lost the destination: " + page.url());
  await page.getByLabel("Email").fill(USERS[user].email);
  await page.getByLabel("Password", { exact: true }).fill(USERS[user].pw);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => u.pathname === path, { timeout: 45000 });
  return page;
}
const overflow = async (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

for (const mobile of [false, true]) {
  const tag = mobile ? "phone" : "desktop";
  const mk = () => browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });

  await check(`[${tag}] booking link -> citizen: login, then the exact booking (Completed, review still possible/published)`, async () => {
    const ctx = await mk(); const page = await openAs(ctx, "citizen", bookingPath);
    await page.getByRole("heading", { name: `Booking ${state.reference}` }).waitFor({ timeout: 30000 });
    await page.getByText("Back to my bookings").waitFor();
    await page.getByText("Completed", { exact: true }).first().waitFor();
    if ((await overflow(page)) > 1) throw new Error("horizontal overflow");
    await ctx.close();
  });
  await check(`[${tag}] booking link -> provider: the same booking from the provider's side`, async () => {
    const ctx = await mk(); const page = await openAs(ctx, "provider", bookingPath);
    await page.getByRole("heading", { name: `Booking ${state.reference}` }).waitFor({ timeout: 30000 });
    await page.getByText("Back to booking requests").waitFor();
    await ctx.close();
  });
  await check(`[${tag}] report link -> citizen: their report is highlighted with its outcome`, async () => {
    const ctx = await mk(); const page = await openAs(ctx, "citizen", reportPath);
    await page.locator(".focus-target", { hasText: "E2E test report" }).waitFor({ timeout: 30000 });
    await page.locator(".focus-target").getByText("Dismissed").waitFor();
    if ((await overflow(page)) > 1) throw new Error("horizontal overflow");
    await ctx.close();
  });
  await check(`[${tag}] approval link -> provider: /app/provider opens Provider Tools`, async () => {
    const ctx = await mk(); const page = await openAs(ctx, "provider", "/app/provider");
    await page.getByText("Recent booking requests").waitFor({ timeout: 30000 });
    await ctx.close();
  });
  await check(`[${tag}] admin links opened by non-admins redirect to /app with no admin data`, async () => {
    const ctx = await mk();
    for (const [user, path] of [["citizen", `/admin/reports/${state.report_id}`], ["provider", `/admin/providers/${state.provider_id}`]]) {
      const page = await openAs(ctx, user, path);
      await page.waitForURL((u) => new URL(u).pathname === "/app", { timeout: 30000 });
      if ((await page.content()).includes("E2E test report")) throw new Error("admin data leaked");
      await page.evaluate(() => localStorage.clear()); await page.close();
    }
    await ctx.close();
  });
}
await browser.close();
console.log("JavaScript errors:", errors.length ? errors : "none");
console.log(`${results.filter(Boolean).length}/${results.length} live deep-link checks passed`);
process.exit(results.every(Boolean) && !errors.length ? 0 : 1);
