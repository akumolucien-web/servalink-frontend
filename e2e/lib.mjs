// Shared helpers for the browser E2E (playwright-core driving the installed Chrome).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

export const APP = process.env.APP_URL ?? "http://127.0.0.1:5273";
export const API = process.env.API_URL ?? "http://127.0.0.1:8787";
export const SHOTS = path.resolve("e2e/screenshots");
export const PASSWORD = "Passw0rd1";
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

fs.mkdirSync(SHOTS, { recursive: true });

export async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true });
}

export async function context(browser, { mobile = false } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  ctx.setDefaultTimeout(20_000); ctx.setDefaultNavigationTimeout(90_000);
  return ctx;
}

export async function resetBackend(seed) {
  const response = await fetch(`${API}/__dev/reset?seed=${seed}`);
  if (!response.ok) throw new Error("Could not reset the local backend. Is local_dev.server running?");
}

// The sign-in form takes a phone number. The local simulator keys users as "<+237 phone>@phone.local"
// (see src/auth/devAdapter.ts), so seeded people need a phone here. Pass a phone directly for anyone else.
export const DEV_PHONES = {
  "admin@servalink.test": "600000001",
  "lucien@servalink.test": "600000002",
  "marie@servalink.test": "600000003",
  "lucien@home.test": "600000004",
  "lucien@x.test": "677000111",
  "marie@x.test": "650111222",
  "recover@x.test": "650000000",
};

export async function login(page, who, password = PASSWORD) {
  const phone = who.includes("@") ? DEV_PHONES[who] : who;
  if (!phone) throw new Error(`No dev phone for ${who}; add it to DEV_PHONES in e2e/lib.mjs`);
  await page.goto(`${APP}/login`);
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(/\/(app|admin)/);
}

export async function logout(page) {
  await page.getByRole("button", { name: /^\w/, exact: false }).filter({ has: page.locator(".avatar") }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(`${APP}/`);
}

export async function shot(page, name, options = {}) {
  await page.waitForFunction(() => !document.querySelector('.skeleton, .spinner'), null, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true, ...options });
}
