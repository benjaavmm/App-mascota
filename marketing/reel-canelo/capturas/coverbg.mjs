import { chromium } from "@playwright/test";
const dir = process.argv[2];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(`file://${dir}/engine.html`); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => window.render(1.5)); await p.evaluate(() => { document.getElementById("cap").style.display = "none"; document.getElementById("pr").style.display = "none"; });
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))); await p.waitForTimeout(200);
await p.screenshot({ path: `${dir}/cover-bg.jpg`, type: "jpeg", quality: 92 }); await b.close();
