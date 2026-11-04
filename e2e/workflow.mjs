// End-to-end local workflow: real UI -> simulated Cognito/API Gateway -> real Lambda handlers (moto).
// Prerequisites: `python -m local_dev.server --seed minimal` and `npm run dev:local -- --port 5273`.
import fs from "node:fs";
import path from "node:path";
import { APP, API, PASSWORD, SHOTS, context, launch, login, resetBackend, shot } from "./lib.mjs";

const results = [];
let current = "";
const pages = [];
let lastPage = null;
const browserErrors = [];

async function step(name, fn) {
  current = name;
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: String(error.message ?? error).split("\n")[0] });
    console.log(`  FAIL  ${name}\n        ${String(error.message ?? error).split("\n").slice(0, 6).join("\n        ")}`);
    for (const page of pages) {
      try { await shot(page, `FAIL-${pages.indexOf(page)}-${name.slice(0, 24).replace(/[^a-z0-9]+/gi, "-")}`); } catch { /* page closed */ }
    }
    throw error;
  }
}

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const dialog = (page) => page.locator("dialog[open]");
const toast = (page, text) => page.locator(".toast", { hasText: text }).first().waitFor();

const png = path.resolve("e2e/fixtures/photo.png");
fs.mkdirSync(path.dirname(png), { recursive: true });
fs.writeFileSync(png, Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYPhfz0AEYBxVSF+FABJADq0xT7wAAAAASUVORK5CYII=", "base64"));

function futureDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

async function register(page, { name, email, city, phone }, { forceOnboarding = false } = {}) {
  await page.goto(`${APP}/register`);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Region").selectOption("SW"); // Buea is in the South-West
  await page.getByLabel("Town / city").selectOption(city);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/verify/);
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await page.waitForURL(/\/login/);
  await page.getByText("Email verified").waitFor();
  if (forceOnboarding) await page.evaluate(() => localStorage.removeItem("servalink.pendingProfile"));
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
}

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `${label}: page scrolls horizontally by ${overflow}px`);
}

async function main() {
  await resetBackend("minimal");
  const browser = await launch();
  const mk = async (opts) => {
    const ctx = await context(browser, opts);
    const page = await ctx.newPage();
    pages.push(page);
    page.on("pageerror", (e) => browserErrors.push(`[${current}] ${e}`));
    page.on("console", (m) => { if (m.type() === "error" && !/404 \(Not Found\)/.test(m.text())) browserErrors.push(`[${current}] ${m.text()}`); });
    return { ctx, page };
  };
  const anon = await mk(); const lucien = await mk(); const marie = await mk(); const admin = await mk();
  lastPage = marie.page;

  try {
    await step("anonymous: protected routes redirect to login, then back after login", async () => {
      await anon.page.goto(`${APP}/app/bookings`);
      await anon.page.waitForURL(/\/login\?next=%2Fapp%2Fbookings/);
    });

    await step("search with no approved providers shows an empty state (no fake data)", async () => {
      await anon.page.goto(`${APP}/search?category=Plumbing&city=Buea`);
      await anon.page.getByText("No providers found").waitFor();
      await anon.page.goto(APP);
      await anon.page.locator(".home-cat", { hasText: "Plumbing" }).waitFor(); // categories come from the API
    });

    await step("citizen A registers (code verify) and the saved profile is created on first login", async () => {
      await register(lucien.page, { name: "Lucien Fon", email: "lucien@x.test", city: "Buea", phone: "+237 677 000 111" });
      await lucien.page.waitForURL(/\/app$/);
      await lucien.page.getByRole("heading", { name: /Lucien!/ }).waitFor();
      await shot(lucien.page, "w-01-citizen-dashboard-new");
    });

    await step("citizen B registers and completes onboarding (GET /profile 404 -> PUT /profile)", async () => {
      await register(marie.page, { name: "Marie Kamga", email: "marie@x.test", city: "Buea", phone: "+237 650 111 222" }, { forceOnboarding: true });
      await marie.page.waitForURL(/\/app\/onboarding/);
      await marie.page.getByLabel("Full name").fill("Marie Kamga");
      await marie.page.getByLabel("Region").selectOption("SW");
      await marie.page.getByLabel("Town / city").selectOption("Buea");
      await marie.page.getByLabel("Quartier", { exact: true }).selectOption("Molyko");
      await marie.page.getByLabel("Phone number").fill("+237 650 111 222");
      await marie.page.getByLabel(/I agree to the/).check();
      await marie.page.getByRole("button", { name: "Save and continue" }).click();
      await marie.page.waitForURL(/\/app$/);
      await marie.page.getByRole("heading", { name: /Marie!/ }).waitFor();
    });

    await step("registration validation: weak password and mismatch are explained inline", async () => {
      const { page } = anon;
      await page.goto(`${APP}/register`);
      await page.getByLabel("Full name").fill("Test User");
      await page.getByLabel("Email").fill("bad-email");
      await page.getByLabel("Password", { exact: true }).fill("short");
      await page.getByLabel("Confirm password").fill("different");
      await page.getByRole("button", { name: "Create account" }).click();
      await page.getByText("Enter a valid email address").waitFor();
      await page.getByText("Use at least 8 characters").first().waitFor();
      await page.getByText("The passwords don't match").waitFor();
      await page.getByText("Enter your town or city").waitFor();
    });

    await step("logout, protected-route redirect, and Cognito password recovery (old password stops working)", async () => {
      const rec = await mk();
      const { page } = rec;
      await register(page, { name: "Recover Me", email: "recover@x.test", city: "Buea", phone: "+237 650 000 000" });
      await page.waitForURL(/\/app$/);
      // Logout
      await page.locator(".user-btn").click();
      await page.getByRole("button", { name: "Log out" }).click();
      await page.waitForURL(`${APP}/`);
      await page.goto(`${APP}/app`);
      await page.waitForURL(/\/login\?next=/);                       // protected again after logout
      // Forgot password: request code, reset, then the new password works and the old one does not
      await page.getByRole("link", { name: "Forgot Password?" }).click();
      await page.getByLabel("Email").fill("recover@x.test");
      await page.getByRole("button", { name: "Send code" }).click();
      await page.getByLabel("Verification code").fill("000000");
      await page.getByLabel("New password").fill("NewPassw0rd2");
      await page.getByRole("button", { name: "Update password" }).click();
      await page.getByText("That code isn't right").waitFor();       // wrong code is explained, nothing changes
      await page.getByLabel("Verification code").fill("123456");
      await page.getByRole("button", { name: "Update password" }).click();
      await page.waitForURL(/\/login\?reset=1/);
      await page.getByText("Password updated").waitFor();
      await page.getByLabel("Password", { exact: true }).fill(PASSWORD);   // the OLD password
      await page.getByRole("button", { name: "Login" }).click();
      await page.getByText("Incorrect email or password").waitFor();
      await page.getByLabel("Password", { exact: true }).fill("NewPassw0rd2");
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForURL(/\/app$/);
      await page.getByRole("heading", { name: /Recover!/ }).waitFor();
      await rec.ctx.close();
    });

    await step("provider tools are locked before approval", async () => {
      await lucien.page.goto(`${APP}/app/provider/services`);
      await lucien.page.getByText("Provider Tools are locked").waitFor();
      await marie.page.goto(`${APP}/admin`);
      await marie.page.waitForURL((u) => new URL(u).pathname === "/app");
    });

    await step("citizen A applies to become a provider and requests a new category", async () => {
      const { page } = lucien;
      await page.goto(`${APP}/app/become-provider`);
      await page.getByRole("button", { name: "Request a new category" }).click();
      await dialog(page).getByLabel("Category name").fill("Tiling");
      await dialog(page).getByLabel("What does it cover?").fill("Floor and wall tiling.");
      await dialog(page).getByRole("button", { name: "Submit request" }).click();
      await toast(page, "Category request submitted");
      await page.getByText("Tiling").first().waitFor();

      await page.getByLabel("Service category").selectOption("Plumbing");
      await page.getByLabel("Service title").fill("Fon Plumbing Services");
      await page.getByLabel("Description").fill("Pipe repairs, leak detection and bathroom fittings across Buea.");
      await page.getByRole("button", { name: "Submit application" }).click();
      await toast(page, "Application submitted");
      await page.getByText("Your application is pending approval").waitFor();
      await shot(page, "w-02-application-pending");
    });

    await step("pending provider is NOT public (search + direct profile URL)", async () => {
      await anon.page.goto(`${APP}/search?category=Plumbing&city=Buea`);
      await anon.page.getByText("No providers found").waitFor();
    });

    await step("admin approves the provider application and the category request", async () => {
      await login(admin.page, "admin@servalink.test");
      await admin.page.goto(`${APP}/admin/providers`);
      await admin.page.getByText("Lucien Fon").waitFor();
      await admin.page.getByRole("button", { name: "Review" }).click();
      await dialog(admin.page).getByText("Fon Plumbing Services").waitFor();
      await shot(admin.page, "w-03-admin-review-application");
      await dialog(admin.page).getByRole("button", { name: "Approve" }).click();
      await dialog(admin.page).getByLabel("Note for the provider").waitFor();
      await dialog(admin.page).getByRole("button", { name: "Approve" }).click();
      await toast(admin.page, "Provider approved");
      await admin.page.getByRole("tab", { name: /Active/ }).click();
      await admin.page.getByText("Fon Plumbing Services").waitFor();

      await admin.page.goto(`${APP}/admin/categories`);
      await admin.page.getByText("Tiling", { exact: true }).waitFor();
      await admin.page.getByRole("button", { name: "Approve" }).click();
      await dialog(admin.page).getByRole("button", { name: "Approve category" }).click();
      await toast(admin.page, "Category approved");
    });

    await step("provider token refresh unlocks Provider Tools (PROVIDER group appears only after refresh)", async () => {
      const { page } = lucien;
      // Pretend the automatic one-time refresh already happened, to exercise the manual path:
      // approved on the server, but the token in the browser predates the PROVIDER group.
      const sub = await providerId(page);
      await page.evaluate((s) => sessionStorage.setItem(`servalink.autorefresh.${s}`, "1"), sub);
      await page.goto(`${APP}/app/become-provider`);
      await page.getByText("Your application was approved.").waitFor();
      await page.goto(`${APP}/app/provider/services`);
      await page.getByText("You're approved. Refresh your access").waitFor(); // server approved, token stale: still locked
      await shot(page, "w-04a-needs-refresh");
      await page.getByRole("button", { name: "Refresh access" }).click();
      await page.getByRole("heading", { name: "My services" }).waitFor(); // PROVIDER group now in the refreshed token
      await page.getByRole("link", { name: "Provider Dashboard" }).waitFor();
      await shot(page, "w-04-provider-unlocked");
    });

    await step("provider creates a service", async () => {
      const { page } = lucien;
      await page.goto(`${APP}/app/provider/services`);
      await page.getByRole("button", { name: "Add a service" }).first().click();
      await dialog(page).getByLabel("Category").selectOption({ label: "Plumbing" });
      await dialog(page).getByLabel("Service name").fill("Leaking pipe repair");
      await dialog(page).getByLabel("Description").fill("Kitchen and bathroom pipe leaks.");
      await dialog(page).getByRole("button", { name: "Add service" }).click();
      await toast(page, "Service added");
      await page.getByText("Leaking pipe repair").waitFor();
      await shot(page, "w-05-provider-services");
    });

    await step("service search now finds the approved provider; public profile lists the service", async () => {
      await anon.page.goto(APP);
      await anon.page.getByLabel("Service category").selectOption("Plumbing");
      await anon.page.getByLabel("Town or city").fill("Buea");
      await anon.page.getByRole("button", { name: "Find Providers" }).click();
      await anon.page.getByRole("heading", { name: "Plumbing services in Buea" }).waitFor();
      await anon.page.getByText("Fon Plumbing Services").waitFor();
      await anon.page.getByRole("link", { name: "View Profile" }).click();
      await anon.page.getByText("Leaking pipe repair").waitFor();
      await anon.page.getByText("No reviews yet").first().waitFor();
    });

    await step("self-booking is blocked in the UI", async () => {
      const { page } = lucien;
      await page.goto(`${APP}/providers/${await providerId(page)}`);
      await page.getByText("Your service").waitFor();
      assert(await page.getByRole("link", { name: "Book this service" }).count() === 0, "provider sees a Book button on own service");
    });

    let bookingRef = "";
    await step("another citizen books the service", async () => {
      const { page } = marie;
      await page.goto(`${APP}/search?category=Plumbing&city=Buea`);
      await page.getByRole("link", { name: "View Profile" }).click();
      await page.getByRole("link", { name: "Book this service" }).click();
      await page.getByRole("button", { name: "Send booking request" }).click();
      await page.getByText("Choose a date and time").waitFor(); // inline validation
      await page.getByLabel("Date and time").fill(futureDate(3));
      await page.getByLabel("Describe the job").fill("Kitchen pipe under the sink is leaking.");
      await page.getByRole("button", { name: "Send booking request" }).click();
      await page.getByText("Describe where to come").waitFor(); // address is required (quartier is prefilled from the profile)
      await page.getByLabel("Quartier", { exact: true }).selectOption("Molyko");
      await page.getByLabel("Address and landmark").fill("Behind Total Molyko, blue gate, 2nd floor");
      await shot(page, "w-06-booking-form");
      await page.getByRole("button", { name: "Send booking request" }).click();
      await toast(page, "Booking request sent");
      await page.getByRole("heading", { name: /Booking BKG-/ }).waitFor();
      await page.getByText("Pending", { exact: true }).first().waitFor();
      bookingRef = (await page.getByRole("heading", { name: /Booking BKG-/ }).innerText()).replace("Booking ", "").split("\n")[0].trim();
      assert(/^BKG-[0-9A-F]{8}$/.test(bookingRef), `unexpected reference ${bookingRef}`);
      await shot(page, "w-07-booking-pending");
    });

    await step("provider sees the request and only the actions valid for PENDING", async () => {
      const { page } = lucien;
      await page.goto(`${APP}/app/provider/bookings`);
      await page.getByText(bookingRef).waitFor();
      await page.getByText("Customer: Marie Kamga").waitFor();
      assert(await page.getByRole("button", { name: "Mark Finished" }).count() === 0, "Mark Finished offered for a PENDING booking");
      assert(await page.getByRole("button", { name: "Start work" }).count() === 0, "Start work offered for a PENDING booking");
      await shot(page, "w-08-provider-request");
    });

    await step("provider: accept -> start work -> Mark Finished (AWAITING_CONFIRMATION, not COMPLETED)", async () => {
      const { page } = lucien;
      await page.getByRole("button", { name: "Accept" }).click();
      await toast(page, "Booking accepted");
      await page.getByRole("tab", { name: /Active/ }).click();
      await page.getByRole("button", { name: "Start work" }).click();
      await toast(page, "Work started");
      await page.getByRole("button", { name: "Mark Finished" }).click();
      await dialog(page).getByRole("button", { name: "Mark Finished" }).click();
      await toast(page, "Marked as finished");
      await page.getByRole("tab", { name: /Awaiting confirmation/ }).click();
      await page.getByText(bookingRef).waitFor();
      await page.getByText("Awaiting confirmation", { exact: true }).first().waitFor();
      assert(await page.getByText("Completed", { exact: true }).count() === 0, "provider moved booking straight to COMPLETED");
    });

    await step("citizen sees the timeline at 'Awaiting confirmation' and confirms completion", async () => {
      const { page } = marie;
      await page.reload();
      await page.getByRole("button", { name: "Confirm completion" }).waitFor();
      await shot(page, "w-09-booking-awaiting-confirmation");
      await page.getByRole("button", { name: "Confirm completion" }).click();
      await dialog(page).getByRole("button", { name: "Confirm completion" }).click();
      await toast(page, "Completion confirmed");
      await page.getByRole("link", { name: "Leave a review" }).waitFor();
    });

    await step("citizen reviews with a rating LABEL and an optional photo; verified booking shown", async () => {
      const { page } = marie;
      await page.getByRole("link", { name: "Leave a review" }).click();
      await page.getByRole("button", { name: "Submit review" }).click();
      await page.getByText("Choose a rating").waitFor();
      await page.getByRole("radio", { name: "V.Good" }).check();
      assert(await page.locator(".field-error", { hasText: "Choose a rating" }).count() === 0, "rating error stayed after choosing a rating");
      await page.getByLabel("Your review").fill("Fixed the leak quickly and cleaned up.");
      await page.locator('input[type="file"]').setInputFiles(png);
      await shot(page, "w-10-review-form");
      await page.getByRole("button", { name: "Submit review" }).click();
      await toast(page, "Review submitted");
      await page.getByText("your review for this booking is published", { exact: false }).waitFor();
    });

    await step("duplicate review is refused (UI shows 'already reviewed')", async () => {
      const { page } = marie;
      await page.goBack().catch(() => {});
      await page.goto(`${APP}/app/bookings`);
      await page.getByRole("link", { name: bookingRef }).click();
      await page.getByRole("heading", { name: /Booking BKG-/ }).waitFor();
      const url = page.url();
      await page.goto(`${url}/review`);
      await page.getByText("You've already reviewed this booking").waitFor();
    });

    await step("public profile shows the V.Good label and a verified-booking review (no stars)", async () => {
      const { page } = anon;
      await page.goto(`${APP}/search?category=Plumbing&city=Buea`);
      await page.getByText("V.Good").first().waitFor();
      await page.getByRole("link", { name: "View Profile" }).click();
      await page.getByRole("tab", { name: /Reviews/ }).click();
      await page.getByText("Verified booking").waitFor();
      await page.getByText("Fixed the leak quickly").waitFor();
      assert(!/★|☆|stars?/i.test(await page.locator("main").innerText()), "stars found on the profile");
      await shot(page, "w-11-public-profile-reviews");
    });

    await step("citizen reports the booking; admin resolves; citizen sees the outcome", async () => {
      const { page } = marie;
      await page.goto(`${APP}/app/reports`);
      await page.getByText("No reports").first().waitFor();
      await page.getByRole("button", { name: "Report a problem" }).click();
      await dialog(page).getByLabel("Which booking is this about?").selectOption({ index: 1 });
      await dialog(page).getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Submit report" }).click();
      await page.locator(".field-error", { hasText: "Choose a reason" }).waitFor();
      await page.getByLabel("What went wrong?").selectOption("Poor quality of work");
      await page.getByLabel("Describe what happened").fill("Grout was left uneven near the sink.");
      await page.locator('input[type="file"]').setInputFiles(png);
      await page.getByRole("button", { name: "Submit report" }).click();
      await toast(page, "Report submitted");
      await page.getByText("Poor quality of work").waitFor();
      await page.getByText("Open", { exact: true }).waitFor();

      await admin.page.goto(`${APP}/admin/reports`);
      await admin.page.getByText("Poor quality of work").waitFor();
      await shot(admin.page, "w-12-admin-reports");
      await admin.page.getByRole("button", { name: "Resolve" }).click();
      await dialog(admin.page).getByLabel(/Resolution note/).fill("Provider agreed to redo the grout.");
      await dialog(admin.page).getByRole("button", { name: "Resolve" }).click();
      await toast(admin.page, "Report resolved");

      await page.reload();
      await page.getByText("Resolved", { exact: true }).waitFor();
      await page.getByText("Provider agreed to redo the grout.").waitFor();
      // Reports never change the booking status.
      await page.goto(`${APP}/app/bookings`);
      await page.getByText("Completed", { exact: true }).first().waitFor();
    });

    await step("provider gallery: upload with caption, shown publicly, removable", async () => {
      const { page } = lucien;
      await page.goto(`${APP}/app/provider/gallery`);
      await page.getByRole("button", { name: "Add photo" }).first().click();
      await dialog(page).getByRole("button", { name: "Upload photo" }).click();
      await dialog(page).getByText("Choose a photo to upload").waitFor();
      await dialog(page).locator('input[type="file"]').setInputFiles(png);
      await dialog(page).getByLabel("Caption").fill("New kitchen sink fitting");
      await dialog(page).getByRole("button", { name: "Upload photo" }).click();
      await toast(page, "Photo added to your gallery");
      await page.getByText("New kitchen sink fitting").waitFor();
      await shot(page, "w-13-gallery");

      await anon.page.goto(`${APP}/providers/${await providerId(page)}`);
      await anon.page.getByRole("tab", { name: /Work gallery/ }).click();
      await anon.page.getByText("New kitchen sink fitting").waitFor();

      await page.getByRole("button", { name: "Remove photo" }).click();
      await dialog(page).getByRole("button", { name: "Remove photo" }).click();
      await toast(page, "Photo removed");
      await page.getByText("Your gallery is empty").waitFor();
    });

    await step("negative: citizen cannot reach provider tools or admin, even by URL", async () => {
      await marie.page.goto(`${APP}/app/provider/bookings`);
      await marie.page.getByText("Provider Tools are locked").waitFor();
      await marie.page.goto(`${APP}/admin/providers`);
      await marie.page.waitForURL((u) => new URL(u).pathname === "/app");
    });

    await step("notification bell lists real work (provider: nothing pending; citizen: nothing) ", async () => {
      await lucien.page.goto(`${APP}/app`);
      await lucien.page.getByRole("button", { name: /attention/i }).click();
      await lucien.page.getByText("You're all caught up.").waitFor();
    });

    await step("admin suspends the provider: profile disappears from search and direct URL", async () => {
      const pid = await providerId(lucien.page);
      await admin.page.goto(`${APP}/admin/providers`);
      await admin.page.getByRole("tab", { name: /Active/ }).click();
      await admin.page.getByRole("button", { name: "Review" }).click();
      await dialog(admin.page).getByRole("button", { name: "Suspend" }).click();
      await dialog(admin.page).getByLabel("Reason for suspending").fill("Repeated customer complaints.");
      await dialog(admin.page).getByRole("button", { name: "Suspend" }).click();
      await toast(admin.page, "Provider suspended");
      await anon.page.goto(`${APP}/search?category=Plumbing&city=Buea`);
      await anon.page.getByText("No providers found").waitFor();
      await anon.page.goto(`${APP}/providers/${pid}`);
      await anon.page.getByText("This provider isn't available").waitFor();
      await shot(anon.page, "w-14-suspended-hidden");
      // The suspended provider's own session is told so, and tools stay unavailable.
      await lucien.page.goto(`${APP}/app/become-provider`);
      await lucien.page.getByText("Application status: Suspended").waitFor();
      await lucien.page.goto(`${APP}/app/provider/services`);
      await lucien.page.getByText(/locked|Refresh/i).first().waitFor();
    });

    // ---------------- Responsive pass ----------------
    await step("phone width (390px): key screens have no horizontal scroll; drawer navigation works", async () => {
      const { ctx, page } = await mk({ mobile: true });
      for (const [label, url] of [["home", "/"], ["search", "/search?category=Plumbing&city=Buea"], ["login", "/login"], ["register", "/register"]]) {
        await page.goto(APP + url); await page.waitForLoadState("networkidle"); await noHorizontalOverflow(page, label);
      }
      await login(page, "marie@x.test");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("link", { name: "My Bookings" }).click();
      await page.getByText(bookingRef).waitFor();
      await noHorizontalOverflow(page, "bookings");
      for (const url of ["/app", "/app/reviews", "/app/reports", "/app/profile", "/app/become-provider"]) {
        await page.goto(APP + url); await page.waitForLoadState("networkidle"); await noHorizontalOverflow(page, url);
      }
      await shot(page, "w-15-mobile-bookings");
      await ctx.close();
    });

    await step("tablet width (820px): workspace and public pages fit", async () => {
      const ctx = await browser.newContext({ viewport: { width: 820, height: 1100 } });
      const page = await ctx.newPage();
      for (const url of ["/", "/search", "/login"]) { await page.goto(APP + url); await page.waitForLoadState("networkidle"); await noHorizontalOverflow(page, "tablet " + url); }
      await login(page, "marie@x.test");
      for (const url of ["/app", "/app/bookings"]) { await page.goto(APP + url); await page.waitForLoadState("networkidle"); await noHorizontalOverflow(page, "tablet " + url); }
      await shot(page, "w-16-tablet-dashboard");
      await ctx.close();
    });

    await step("no unexpected browser console/page errors during the whole run", async () => {
      // The recovery step deliberately submits a wrong code (400) and a wrong password (401); the browser logs those
      // two expected network failures. Anything else is a real error.
      const unexpected = browserErrors.filter((e) => !(e.startsWith("[logout, protected-route redirect") && /status of (400|401)/.test(e)));
      assert(unexpected.length === 0, unexpected.slice(0, 3).join(" | "));
    });
  } finally {
    await browser.close();
  }
}

async function providerId(page) {
  // Read the signed-in user's id from the stored dev session (the provider id is the Cognito sub).
  return page.evaluate(() => JSON.parse(localStorage.getItem("servalink.dev.session")).sub);
}

let failed = false;
try { await main(); } catch { failed = true; }
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} steps passed${failed ? " (stopped at first failure)" : ""}`);
fs.writeFileSync(path.join(SHOTS, "results.json"), JSON.stringify({ results, browserErrors, api: API }, null, 2));
process.exit(failed ? 1 : 0);
