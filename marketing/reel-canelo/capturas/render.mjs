// Renderiza engine.html cuadro a cuadro (30 fps) a PNGs.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const dir = process.argv[2], from = Number(process.argv[3] ?? 0), to = process.argv[4] ? Number(process.argv[4]) : null, step = Number(process.argv[5] ?? 1);
const FPS = 30;
mkdirSync(`${dir}/frames`, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(`file://${dir}/engine.html`);
await p.evaluate(() => document.fonts.ready);
const total = await p.evaluate(() => TIMELINE.duration);
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
const last = to ?? Math.round(total * FPS);
for (let f = from; f < last; f += step) {
  await p.evaluate((t) => window.render(t), f / FPS);
  if (f === from) { await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))); await p.waitForTimeout(200); }
  await p.screenshot({ path: `${dir}/frames/f${String(f).padStart(5, "0")}.jpg`, type: "jpeg", quality: 92 });
}
console.log("frames", from, last, "total", total);
await b.close();
