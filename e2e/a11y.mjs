// Automated accessibility scan (axe-core, WCAG 2.1 A/AA) over the main screens with the demo seed.
import fs from "node:fs";
import { APP, context, launch, login, resetBackend } from "./lib.mjs";

const axe = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
await resetBackend("demo");
const browser = await launch();
let total = 0;

async function scan(page, label) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.querySelector(".skeleton"), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(axe);
  const result = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }));
  const bad = result.violations.filter((v) => ["serious", "critical", "moderate"].includes(v.impact));
  total += bad.length;
  console.log(`${bad.length ? "FAIL" : "ok  "} ${label}`);
  for (const v of bad) console.log(`      [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0].target.join(" ")}`);
}

const anon = (await context(browser)).newPage();
const a = await anon;
for (const [label, url] of [["home", "/"], ["search", "/search?category=Plumbing&city=Buea"], ["login", "/login"], ["register", "/register"], ["forgot-password", "/forgot-password"], ["verify-email", "/verify?phone=%2B237677123456"], ["become-provider", "/become-provider"]]) {
  await a.goto(APP + url); await scan(a, label);
}
await a.getByRole("link", { name: "Log in" }).first().click().catch(() => {});
await a.goto(APP + "/search?category=Plumbing&city=Buea"); await a.getByRole("link", { name: "View Profile" }).first().click(); await scan(a, "provider-profile");

const marie = await (await context(browser)).newPage();
await login(marie, "marie@servalink.test");
for (const [label, url] of [["dashboard", "/app"], ["bookings", "/app/bookings"], ["reviews", "/app/reviews"], ["reports", "/app/reports"], ["profile", "/app/profile"], ["become-provider-form", "/app/become-provider"]]) {
  await marie.goto(APP + url); await scan(marie, label);
}
await marie.goto(APP + "/app/bookings"); await marie.locator("article").first().getByRole("link", { name: "View details" }).click(); await scan(marie, "booking-detail");

const lucien = await (await context(browser)).newPage();
await login(lucien, "lucien@servalink.test");
for (const [label, url] of [["provider-dashboard", "/app/provider"], ["provider-requests", "/app/provider/bookings"], ["provider-services", "/app/provider/services"], ["provider-gallery", "/app/provider/gallery"], ["provider-profile", "/app/provider/profile"]]) {
  await lucien.goto(APP + url); await scan(lucien, label);
}
const admin = await (await context(browser)).newPage();
await login(admin, "admin@servalink.test");
for (const [label, url] of [["admin-dashboard", "/admin"], ["admin-providers", "/admin/providers"], ["admin-reports", "/admin/reports"], ["admin-categories", "/admin/categories"]]) {
  await admin.goto(APP + url); await scan(admin, label);
}
await browser.close();
console.log(total ? `\n${total} violation group(s)` : "\nNo serious/critical/moderate accessibility violations found");
process.exit(total ? 1 : 0);
