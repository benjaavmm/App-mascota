// Renderiza cada diapositiva de carrusel.html a JPG.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const dir = process.argv[2], out = `${dir}/out/imagenes`;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("requestfailed", (r) => errs.push(r.url()));
await p.goto(`file://${dir}/carrusel.html`);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
for (const el of await p.locator("[data-name]").all()) {
  const name = await el.getAttribute("data-name");
  await el.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 94 });
}
console.log("errors:", errs.slice(0, 5));
await b.close();
