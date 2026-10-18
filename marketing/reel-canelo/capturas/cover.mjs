import { chromium } from "@playwright/test";
const dir = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(`file://${dir}/cover.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: out, type: "jpeg", quality: 92 }); await b.close();
