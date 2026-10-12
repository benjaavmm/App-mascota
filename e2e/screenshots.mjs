// Genera capturas para el README: node e2e/screenshots.mjs (con la app y Supabase corriendo).
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOTS_DIR ?? "docs/capturas";

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
);

async function shoot(context, path, file, { fullPage = false } = {}) {
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage });
  await page.close();
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-CL",
});
await shoot(mobile, "/", "inicio-movil.png");
await shoot(mobile, "/mascotas?tipo=adopcion", "buscar-movil.png");

// Ficha de la primera mascota en adopción.
const page = await mobile.newPage();
await page.goto(`${BASE}/mascotas?tipo=adopcion`, { waitUntil: "networkidle" });
const href = await page.locator('a[href^="/mascotas/"]').first().getAttribute("href");
await page.close();
if (href) await shoot(mobile, href, "ficha-movil.png");

// Sesión de ejemplo para pantallas privadas.
const login = await mobile.newPage();
await login.goto(`${BASE}/ingresar`);
await login.getByLabel("Correo electrónico").fill("adoptante@ayudapatitas.test");
await login.getByLabel("Contraseña", { exact: true }).fill("AyudaPatitas2026");
await login.getByRole("button", { name: "Ingresar" }).click();
await login.waitForURL((url) => !url.pathname.startsWith("/ingresar"));
await login.close();
await shoot(mobile, "/alertas", "alertas-movil.png");
await shoot(mobile, "/publicar?especie=gatos", "publicar-movil.png");

const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-CL" });
await shoot(desktop, "/", "inicio-escritorio.png");
await shoot(desktop, "/mascotas?tipo=adopcion", "buscar-escritorio.png");

await browser.close();
console.log(`Capturas guardadas en ${OUT}`);
