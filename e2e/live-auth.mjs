// Read-only checks of the LIVE authentication pages: painter image, layout, password recovery, redirects. Creates no data.
import { chromium } from "playwright-core";
import path from "node:path";
import { SHOTS } from "./lib.mjs";

const SITE = process.env.SITE ?? "https://main.d3t3isz8grbi9v.amplifyapp.com";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let failed = 0; const errors = [];
async function check(name, fn) {
  try { await fn(); console.log("  PASS ", name); } catch (e) { failed++; console.log("  FAIL ", name, "\n        " + String(e.message).split("\n")[0]); }
}
for (const [tag, opts] of [["desktop", { viewport: { width: 1448, height: 1086 } }], ["phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await (await browser.newContext(opts)).newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const [label, url, heading] of [["login", "/login", "Welcome Back"], ["signup", "/register", "Create Your Account"]]) {
    await check(`[${tag}] ${label}: renders, painter image ${tag === "desktop" ? "loads from the live site" : "panel hidden"}, no overflow`, async () => {
      await page.goto(SITE + url, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: heading }).waitFor();
      const r = await page.evaluate(async () => {
        const el = document.querySelector(".auth-visual-img");
        const u = getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
        const res = await fetch(u); const bmp = await createImageBitmap(await res.blob());
        return { u: new URL(u).pathname, status: res.status, type: res.headers.get("content-type"), w: bmp.width, shown: el.offsetParent !== null, over: document.documentElement.scrollWidth - window.innerWidth };
      });
      if (r.status !== 200 || r.type !== "image/webp" || r.w !== 1448) throw new Error("image not served correctly: " + JSON.stringify(r));
      if (r.shown !== (tag === "desktop")) throw new Error("panel visibility wrong: " + JSON.stringify(r));
      if (r.over > 1) throw new Error("overflow " + r.over);
      if (tag === "desktop") console.log("        image:", r.u, r.type, r.w + "px wide");
      await page.screenshot({ path: path.join(SHOTS, `live-${label}-${tag}.png`), fullPage: true });
    });
  }
  if (tag === "desktop") {
    await check("password recovery: page renders and Cognito answers a reset request for an unknown address", async () => {
      await page.goto(SITE + "/login", { waitUntil: "networkidle" });
      await page.getByRole("link", { name: "Forgot password?" }).click();
      await page.getByRole("heading").first().waitFor();
      await page.waitForURL(/forgot-password/);
      await page.getByLabel("Phone number").fill("600000999");
      await page.getByRole("button", { name: /send|reset|continue/i }).first().click();
      await page.waitForTimeout(4000);
      console.log("        page says:", JSON.stringify((await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 160)));
    });
    await check("provider search: category list loads and search results page opens", async () => {
      await page.goto(SITE + "/", { waitUntil: "networkidle" });
      await page.getByLabel("Service category").locator("option").nth(1).waitFor({ state: "attached" });
      const n = await page.getByLabel("Service category").locator("option").count();
      await page.goto(`${SITE}/search?category=Plumbing&city=Buea`, { waitUntil: "networkidle" });
      await page.locator("h1").first().waitFor();
      console.log("        category options:", n - 1);
    });
    await check("booking and admin deep links: signed-out visitor is sent to the new login page with the destination kept", async () => {
      for (const p of ["/app/bookings/abc", "/admin", "/admin/providers/abc"]) {
        await page.goto(SITE + p, { waitUntil: "networkidle" });
        await page.waitForURL(/\/login\?next=/);
        await page.getByRole("heading", { name: "Welcome Back" }).waitFor();
        if (decodeURIComponent(new URL(page.url()).searchParams.get("next")) !== p) throw new Error(p + " -> " + page.url());
      }
    });
  }
}
await browser.close();
console.log("JavaScript errors:", errors.length ? errors : "none");
process.exit(failed || errors.length ? 1 : 0);
