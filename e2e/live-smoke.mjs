// Smoke test of the LIVE deployment (real Amplify site, real API, real Cognito). Read-only: it never signs up or
// creates data. The only write-like call is a sign-in attempt for a user that does not exist, to prove Cognito answers.
import { chromium } from "playwright-core";

const SITE = process.env.SITE ?? "https://main.d3t3isz8grbi9v.amplifyapp.com";
const API_HOST = "fdm8o4fdn9.execute-api.us-east-1.amazonaws.com";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const results = [];
const issues = { jsErrors: [], consoleErrors: [], failedRequests: [], badResponses: [] };
const apiCalls = [];

async function check(name, fn) {
  try { await fn(); results.push([name, true]); console.log("  PASS ", name); }
  catch (e) { results.push([name, false]); console.log("  FAIL ", name, "\n        " + String(e.message).split("\n")[0]); }
}

function watch(page) {
  page.on("pageerror", (e) => issues.jsErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") issues.consoleErrors.push(m.text().slice(0, 200)); });
  page.on("requestfailed", (r) => issues.failedRequests.push(`${r.method()} ${r.url().slice(0, 100)} ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    const url = r.url();
    if (url.includes(API_HOST)) apiCalls.push(`${r.request().method()} ${new URL(url).pathname} -> ${r.status()}`);
    if (r.status() >= 400 && !url.includes("cognito-idp")) issues.badResponses.push(`${r.status()} ${url.slice(0, 110)}`);
  });
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
watch(page);

await check("home loads, shows the app, no local-integration banner", async () => {
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Find the Right Professional for Every Job/ }).waitFor();
  if (await page.getByText("LOCAL INTEGRATION MODE").count()) throw new Error("dev banner present in production");
});
await check("browser reaches GET /service-categories cross-origin (CORS works from the Amplify origin)", async () => {
  await page.waitForResponse((r) => r.url().includes(API_HOST) && r.url().includes("/service-categories") && r.status() === 200).catch(() => {});
  if (!apiCalls.some((c) => c.includes("/service-categories -> 200"))) throw new Error("no 200 for /service-categories: " + apiCalls.join("; "));
  await page.getByLabel("Service category").locator("option").first().waitFor({ state: "attached" });
});
await check("search page calls GET /providers and shows the empty state", async () => {
  await page.goto(`${SITE}/search?category=Plumbing&city=Buea`, { waitUntil: "networkidle" });
  await page.getByText("No providers found").waitFor();
  if (!apiCalls.some((c) => c.includes("/providers -> 200"))) throw new Error("no 200 for /providers");
});
await check("registration page renders", async () => {
  await page.goto(`${SITE}/register`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Create Your Account" }).waitFor();
});
await check("Cognito is configured: a sign-in for an unknown user gets a Cognito answer (not a config error)", async () => {
  await page.goto(`${SITE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Phone number").fill("600000999");
  await page.getByLabel("Password", { exact: true }).fill("Passw0rd1");
  await page.getByRole("button", { name: "Login" }).click();
  const banner = page.locator(".banner.danger").first();
  await banner.waitFor({ timeout: 20000 });
  const text = await banner.innerText();
  if (!/couldn't find an account|Incorrect phone number or password/i.test(text)) throw new Error("unexpected message: " + text);
  console.log("        Cognito said:", JSON.stringify(text));
});
await check("protected deep links send a signed-out visitor to login and remember the destination", async () => {
  for (const path of ["/admin/providers/abc", "/app/bookings/abc", "/admin/reports/xyz"]) {
    await page.goto(SITE + path, { waitUntil: "networkidle" });
    await page.waitForURL(/\/login\?next=/);
    const next = decodeURIComponent(new URL(page.url()).searchParams.get("next"));
    if (next !== path) throw new Error(`${path} -> next=${next}`);
  }
});
await check("a crafted ?next= cannot leave the site (page still on the Amplify origin)", async () => {
  await page.goto(`${SITE}/login?next=${encodeURIComponent("//evil.example")}`, { waitUntil: "networkidle" });
  if (new URL(page.url()).origin !== SITE) throw new Error("left the site: " + page.url());
});

const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await phone.newPage();
watch(mp);
await check("phone width: home, search, login, register fit the screen", async () => {
  for (const path of ["/", "/search", "/login", "/register"]) {
    await mp.goto(SITE + path, { waitUntil: "networkidle" });
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`${path} overflows by ${overflow}px`);
  }
});
await browser.close();

console.log("\nAPI calls the browser made:", [...new Set(apiCalls)].join(" | "));
console.log("JavaScript errors:", issues.jsErrors.length ? issues.jsErrors : "none");
const cons = issues.consoleErrors.filter((c) => !/cognito-idp|Failed to load resource: the server responded with a status of 400/.test(c));
console.log("Console errors (excluding the expected Cognito 400 for the unknown-user test):", cons.length ? cons : "none");
console.log("Failed network requests:", issues.failedRequests.length ? issues.failedRequests : "none");
console.log("HTTP >=400 responses (excluding Cognito):", issues.badResponses.length ? issues.badResponses : "none");
const failed = results.filter(([, ok]) => !ok).length || issues.jsErrors.length || cons.length || issues.failedRequests.length || issues.badResponses.length;
console.log(`\n${results.filter(([, ok]) => ok).length}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
