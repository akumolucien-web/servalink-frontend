// NOTE: still email-based; needs porting to phone sign-in.
// Deep-link E2E. The links under test are the ones the REAL notification Lambda produced (read from the local
// outbox), opened in a real browser by the right and the wrong people, at desktop and phone width.
// Prerequisites: `python -m local_dev.server --seed minimal` (frontend URL http://127.0.0.1:5273) and `npm run dev:local -- --port 5273`.
import fs from "node:fs";
import path from "node:path";
import { API, APP, PASSWORD, SHOTS, context, launch, resetBackend, shot } from "./lib.mjs";

const results = [];
let failed = false;
async function step(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (error) {
    failed = true; results.push({ name, ok: false, error: String(error.message).split("\n")[0] });
    console.log(`  FAIL  ${name}\n        ${String(error.message).split("\n").slice(0, 4).join("\n        ")}`);
  }
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };

// ---------- API helpers (set the scene quickly; the checks below use the real UI) ----------
async function post(url, body, token) {
  const response = await fetch(API + url, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}
async function asUser(email, groups) {
  await post("/__dev/auth/signup", { email, password: PASSWORD });
  await post("/__dev/auth/confirm", { email, code: "123456" });
  return (await post("/__dev/auth/signin", { email, password: PASSWORD })).data;
}
async function call(token, method, url, body) {
  const response = await fetch(API + url, { method, headers: { "Content-Type": "application/json", Authorization: token }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status} ${JSON.stringify(data)}`);
  return data;
}
const outbox = async () => (await (await fetch(`${API}/__dev/outbox`)).json()).outbox;

await resetBackend("minimal");
const admin = (await post("/__dev/auth/signin", { email: "admin@servalink.test", password: PASSWORD })).data;
const cats = (await (await fetch(`${API}/service-categories`)).json()).categories;
const plumbing = cats.find((c) => c.category_name === "Plumbing");

const lucien = await asUser("lucien@dl.test");
await call(lucien.idToken, "PUT", "/profile", { full_name: "Lucien Fon", city: "Buea" });
await call(lucien.idToken, "POST", "/provider", { service_category: "Plumbing", service_title: "Fon Plumbing", description: "Pipes" });
await call(admin.idToken, "PUT", `/admin/providers/${lucien.sub}/status`, { status: "APPROVED", reason: "ok" });
const lucienTok = (await post("/__dev/auth/signin", { email: "lucien@dl.test", password: PASSWORD })).data.idToken;  // fresh token carries PROVIDER
const service = (await call(lucienTok, "POST", "/services", { category_id: plumbing.category_id, city: "Buea", name: "Leaking pipe repair" })).service;
const marie = await asUser("marie@dl.test");
await call(marie.idToken, "PUT", "/profile", { full_name: "Marie Kamga", city: "Buea" });
const samuel = await asUser("samuel@dl.test");
await call(samuel.idToken, "PUT", "/profile", { full_name: "Samuel Nkeng", city: "Buea" });
const newbie = await asUser("newbie@dl.test");  // signed up, NO ServaLink profile yet
const ada = await asUser("ada@dl.test");
await call(ada.idToken, "PUT", "/profile", { full_name: "Ada Lovelace", city: "Limbe" });

// Generate the notifications by really using the API.
const booking = (await call(marie.idToken, "POST", "/bookings", { service_id: service.service_id, booking_date: "2030-10-20T10:00", message: "Pipe under the sink leaks" })).booking;
await call(lucienTok, "PUT", `/bookings/${booking.booking_id}`, { action: "ACCEPT" });
await call(lucienTok, "PUT", `/bookings/${booking.booking_id}`, { action: "MARK_COMPLETED" });   // booking is now AWAITING_CONFIRMATION
const report = (await call(marie.idToken, "POST", "/reports", { booking_id: booking.booking_id, reason: "Grout left uneven", description: "Near the sink" })).report;
const request = (await call(lucienTok, "POST", "/service-category-requests", { proposed_name: "Tiling", description: "Floor and wall tiling" })).request;
await call(ada.idToken, "POST", "/provider", { service_category: "Plumbing", service_title: "Ada Pipes", description: "Pipes" });

const box = await outbox();
const find = (channel, type) => box.find((m) => m.channel === channel && m.event_type === type);
const snsLink = (subject, mustContain = "") => (box.find((m) => m.channel === "sns" && m.subject === subject && m.message.includes(mustContain))?.message.match(/https?:\/\/\S+/) ?? [])[0];
const L = {
  providerBooking: find("push", "BOOKING_CREATED")?.url,
  citizenAccepted: find("push", "BOOKING_ACCEPTED")?.url,
  citizenConfirm: find("push", "BOOKING_AWAITING_CONFIRMATION")?.url,
  citizenReport: find("push", "REPORT_SUBMITTED_CONFIRMATION")?.url,
  adminProvider: snsLink("New ServaLink provider application", ada.sub),   // Ada's application (Lucien's came first)
  adminReport: snsLink("New ServaLink report"),
  adminCategory: snsLink("New ServaLink category request"),
};
const pathOf = (url) => new URL(url).pathname;
const bookingPath = `/app/bookings/${booking.booking_id}`;

const browser = await launch();

async function signIn(page, email) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
}
async function opensExactly(ctx, url, email, expectPath = pathOf(url)) {
  const page = await ctx.newPage();
  await page.goto(url);                                          // anonymous: must route through login and come back
  await page.waitForURL(/\/login\?next=/);
  assert(decodeURIComponent(new URL(page.url()).searchParams.get("next")) === expectPath, `login lost the destination: ${page.url()}`);
  await signIn(page, email);
  await page.waitForURL((u) => u.pathname === expectPath);
  return page;
}
async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `${label}: horizontal scroll ${overflow}px`);
}
async function inView(page, selector) {
  await page.waitForTimeout(700);
  const visible = await page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; });
  assert(visible, `${selector} is not in the viewport`);
}

console.log("Links produced by the real notification Lambda:"); console.log(JSON.stringify(L, null, 2));

await step("every required notification produced a link on the right channel, under FRONTEND_URL, with no secrets", async () => {
  for (const [name, url] of Object.entries(L)) assert(url, `no link was produced for ${name}`);
  assert(find("email", "BOOKING_CREATED").to[0] === "lucien@dl.test" && find("email", "BOOKING_ACCEPTED").to[0] === "marie@dl.test", "wrong e-mail recipient");
  for (const url of Object.values(L)) { const u = new URL(url); assert(u.origin === APP && !u.search && !u.hash && !url.includes("@"), `unexpected link shape ${url}`); }
  assert(L.providerBooking === `${APP}${bookingPath}` && L.citizenAccepted === L.providerBooking && L.citizenConfirm === L.providerBooking, "booking links differ");
  assert(L.adminProvider === `${APP}/admin/providers/${ada.sub}` && L.adminReport === `${APP}/admin/reports/${report.report_id}` && L.adminCategory === `${APP}/admin/categories/${request.request_id}`, "admin links wrong");
  const mail = find("email", "BOOKING_AWAITING_CONFIRMATION");
  assert(mail.html.includes(`href="${L.citizenConfirm}"`) && mail.text.includes(L.citizenConfirm), "e-mail lacks the clickable link");
});

for (const mobile of [false, true]) {
  const tag = mobile ? "phone" : "desktop";
  const newCtx = () => context(browser, { mobile });

  await step(`[${tag}] provider booking link -> provider booking details (via login)`, async () => {
    const ctx = await newCtx(); const page = await opensExactly(ctx, L.providerBooking, "lucien@dl.test");
    await page.getByRole("heading", { name: `Booking ${booking.reference}` }).waitFor();
    await page.getByText("Back to booking requests").waitFor();            // the provider's side of the shared page
    await page.getByText("Marie Kamga").first().waitFor(); await noOverflow(page, "provider booking"); await shot(page, `dl-${tag}-provider-booking`); await ctx.close();
  });

  await step(`[${tag}] citizen 'accepted' and 'confirm completion' links -> the citizen's booking, with Confirm completion`, async () => {
    const ctx = await newCtx();
    for (const link of [L.citizenAccepted, L.citizenConfirm]) {
      const page = await opensExactly(ctx, link, "marie@dl.test");
      await page.getByText("Back to my bookings").waitFor();
      await page.getByRole("button", { name: "Confirm completion" }).waitFor();  // the page where completion is confirmed
      await noOverflow(page, "citizen booking"); await shot(page, `dl-${tag}-citizen-booking`);
      await page.context().clearCookies(); await page.evaluate(() => localStorage.clear()); await page.close();
    }
    await ctx.close();
  });

  await step(`[${tag}] admin provider-application link -> that application opens`, async () => {
    const ctx = await newCtx(); const page = await opensExactly(ctx, L.adminProvider, "admin@servalink.test");
    await page.locator("dialog[open]").getByText("Ada Pipes").waitFor();
    await page.locator("dialog[open]").getByRole("button", { name: "Approve" }).waitFor();
    await shot(page, `dl-${tag}-admin-provider`);
    await page.locator("dialog[open]").getByRole("button", { name: "Close" }).click();
    await page.waitForURL((u) => u.pathname === "/admin/providers");       // closing returns to the list
    await ctx.close();
  });

  await step(`[${tag}] admin report link -> that report is highlighted`, async () => {
    const ctx = await newCtx(); const page = await opensExactly(ctx, L.adminReport, "admin@servalink.test");
    await page.locator(".focus-target", { hasText: "Grout left uneven" }).waitFor();
    await inView(page, ".focus-target"); await noOverflow(page, "admin report"); await shot(page, `dl-${tag}-admin-report`); await ctx.close();
  });

  await step(`[${tag}] admin category-request link -> that request is highlighted`, async () => {
    const ctx = await newCtx(); const page = await opensExactly(ctx, L.adminCategory, "admin@servalink.test");
    await page.locator(".focus-target", { hasText: "Tiling" }).waitFor();
    await inView(page, ".focus-target"); await noOverflow(page, "admin category"); await shot(page, `dl-${tag}-admin-category`); await ctx.close();
  });

  await step(`[${tag}] citizen report link -> their report is highlighted`, async () => {
    const ctx = await newCtx(); const page = await opensExactly(ctx, L.citizenReport, "marie@dl.test");
    await page.locator(".focus-target", { hasText: "Grout left uneven" }).waitFor();
    await inView(page, ".focus-target"); await noOverflow(page, "citizen report"); await ctx.close();
  });
}

await step("signed-in user opens a link directly (no login detour)", async () => {
  const ctx = await context(browser); const page = await ctx.newPage();
  await page.goto(`${APP}/login`); await signIn(page, "marie@dl.test"); await page.waitForURL(/\/app$/);
  await page.goto(L.citizenConfirm); await page.getByRole("button", { name: "Confirm completion" }).waitFor();
  await ctx.close();
});

await step("a user with no profile keeps the destination through onboarding", async () => {
  const ctx = await context(browser); const page = await ctx.newPage();
  await page.goto(L.providerBooking); await page.waitForURL(/\/login\?next=/); await signIn(page, "newbie@dl.test");
  await page.waitForURL(/\/app\/onboarding\?next=/);
  assert(decodeURIComponent(new URL(page.url()).searchParams.get("next")) === bookingPath, "onboarding lost the destination");
  await page.getByLabel("Full name").fill("New Bie"); await page.getByLabel("Town / city").fill("Buea");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL((u) => u.pathname === bookingPath);
  await page.getByText("We can't find that booking").waitFor();           // not their booking: refused gracefully, not a crash
  await ctx.close();
});

await step("registering from a link keeps the destination through verify, login and profile setup", async () => {
  const ctx = await context(browser); const page = await ctx.newPage();
  await page.goto(L.providerBooking); await page.waitForURL(/\/login\?next=/);
  await page.getByRole("link", { name: "Sign Up" }).click();
  await page.getByLabel("Full name").fill("Fresh Face"); await page.getByLabel("Email").fill("fresh@dl.test");
  await page.getByLabel("Town / city").fill("Buea");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD); await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/verify\?.*next=/);
  await page.getByLabel("Verification code").fill("123456"); await page.getByRole("button", { name: "Verify email" }).click();
  await page.waitForURL(/\/login\?.*next=/);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD); await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => u.pathname === bookingPath);
  await ctx.close();
});

await step("the wrong person gets a clear refusal, not another person's data", async () => {
  const ctx = await context(browser);
  let page = await opensExactly(ctx, L.providerBooking, "samuel@dl.test");   // a citizen who is not a party to the booking
  await page.getByText("We can't find that booking").waitFor();
  assert(!(await page.content()).includes("Pipe under the sink"), "another user's booking message leaked");
  await page.evaluate(() => localStorage.clear()); await page.close();
  page = await opensExactly(ctx, L.adminReport, "marie@dl.test");           // a citizen opening an admin link
  await page.waitForURL((u) => new URL(u).pathname === "/app"); // silently sent to their dashboard
  assert(!(await page.content()).includes("Grout left uneven"), "admin data leaked to a citizen");
  await page.evaluate(() => localStorage.clear()); await page.close();
  page = await opensExactly(ctx, L.adminProvider, "lucien@dl.test");        // even an approved provider
  await page.waitForURL((u) => new URL(u).pathname === "/app"); // silently sent to their dashboard
  await page.evaluate(() => localStorage.clear()); await page.close();
  page = await opensExactly(ctx, L.citizenReport, "samuel@dl.test");        // someone else's report
  await page.getByText("We couldn't find that report").waitFor();
  await ctx.close();
});

await step("missing, deleted or stale records are handled with clear messages", async () => {
  const ctx = await context(browser); const page = await ctx.newPage();
  await page.goto(`${APP}/login`); await signIn(page, "admin@servalink.test"); await page.waitForURL(/\/admin/);
  await page.goto(`${APP}/admin/providers/does-not-exist`); await page.getByText("We couldn't find that provider application").waitFor();
  await page.goto(`${APP}/admin/reports/does-not-exist`); await page.getByText("That report isn't open any more").waitFor();
  await page.goto(`${APP}/admin/categories/does-not-exist`); await page.getByText("We couldn't find that category request").waitFor();
  await page.goto(`${APP}/admin/providers/%2F..%2F%3Cscript%3E`); await page.getByText("We couldn't find that provider application").waitFor();  // hostile id: just "not found"
  // A report that was already resolved is no longer in the open list.
  await call(admin.idToken, "PUT", `/admin/reports/${report.report_id}`, { action: "RESOLVE", admin_note: "Fixed" });
  await page.goto(L.adminReport); await page.getByText("That report isn't open any more").waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${APP}/login`); await signIn(page, "marie@dl.test"); await page.waitForURL(/\/app$/);
  await page.goto(`${APP}/app/bookings/does-not-exist`); await page.getByText("We can't find that booking").waitFor();
  await page.goto(`${APP}/app/reports/does-not-exist`); await page.getByText("We couldn't find that report").waitFor();
  await ctx.close();
});

await step("a crafted ?next= cannot send the user to another site", async () => {
  const ctx = await context(browser);
  for (const hostile of ["//evil.test/phish", "https://evil.test", "/\\evil.test", "javascript:alert(1)"]) {
    const page = await ctx.newPage();
    await page.goto(`${APP}/login?next=${encodeURIComponent(hostile)}`);
    await signIn(page, "marie@dl.test");
    await page.waitForURL((u) => u.pathname !== "/login", { timeout: 15000 });   // login finished and navigated
    assert(new URL(page.url()).origin === APP && new URL(page.url()).pathname === "/app", `hostile next ${hostile} ended at ${page.url()}`);
    await page.evaluate(() => localStorage.clear()); await page.close();
  }
  await ctx.close();
});

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} deep-link steps passed`);
fs.writeFileSync(path.join(SHOTS, "deeplinks-results.json"), JSON.stringify({ links: L, results }, null, 2));
process.exit(failed ? 1 : 0);
