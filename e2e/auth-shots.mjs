// Screenshots of the authentication screens at desktop / tablet / phone widths (local integration mode).
import { APP, launch, shot } from "./lib.mjs";

const browser = await launch();
const sizes = { desktop: [1440, 900], laptop: [1100, 800], tablet: [820, 1100], phone: [390, 844] };
const problems = [];
for (const [name, [width, height]] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const shots = [
    ["login", "/login"], ["register", "/register"], ["verify", "/verify?phone=%2B237677123456"], ["forgot", "/forgot-password"],
  ];
  for (const [label, path] of shots) {
    await page.goto(APP + path, { waitUntil: "networkidle" });
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${name} ${label}: horizontal overflow ${overflow}px`);
    // Every field must stay inside the form column (a field spilling under the image panel would not scroll the page).
    const spill = await page.evaluate(() => {
      const wrap = document.querySelector(".auth-form-wrap").getBoundingClientRect().right;
      return Math.max(0, ...[...document.querySelectorAll(".afield-box, .auth-submit")].map((el) => el.getBoundingClientRect().right - wrap));
    });
    if (spill > 1) problems.push(`${name} ${label}: a field extends ${Math.round(spill)}px past the form column`);
    await shot(page, `auth-${name}-${label}`);
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "no horizontal overflow on any auth screen/width");
