import { chromium } from "@playwright/test";
const dir = process.argv[2]; const times = process.argv.slice(3).map(Number);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(`file://${dir}/engine.html`); await p.evaluate(() => document.fonts.ready);
for (const t of times) { await p.evaluate((t) => window.render(t), t); await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))); await p.waitForTimeout(120); await p.screenshot({ path: `${dir}/still-${t}.jpg`, type: "jpeg", quality: 80 }); }
console.log("errors:", errs.slice(0, 5));
await b.close();
