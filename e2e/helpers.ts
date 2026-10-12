import { expect, type Browser, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
export const SEED_PASSWORD = "AyudaPatitas2026";
export const SEED = {
  admin: "admin@ayudapatitas.test",
  shelter: "fundacion@ayudapatitas.test",
};

// Busca en Mailpit (correo local de Supabase) el último enlace de confirmación enviado a `email`.
export async function getEmailLink(email: string, pathPart = "/auth/confirm") {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
      const message = (await res.json()) as { HTML: string; Text: string };
      const html = message.HTML || message.Text;
      const match = html.match(new RegExp(`href="([^"]*${pathPart.replace(/\//g, "\\/")}[^"]*)"`));
      if (match) return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No llegó el correo a ${email}`);
}

export async function login(page: Page, email: string, password = SEED_PASSWORD) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/ingresar/);
}

export async function newLoggedInPage(browser: Browser, email: string, password = SEED_PASSWORD) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password);
  return page;
}

// Genera una foto JPEG de prueba (con el navegador) y devuelve su ruta.
export async function makeTestPhoto(browser: Browser, name = "perrito.jpg") {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(
    `<div style="width:800px;height:600px;background:linear-gradient(135deg,#fdba74,#ea580c);display:flex;align-items:center;justify-content:center;font:bold 120px sans-serif;color:white">🐶</div>`,
  );
  const buffer = await page.screenshot({ type: "jpeg", quality: 80 });
  await page.close();
  const path = join(tmpdir(), `${Date.now()}-${name}`);
  writeFileSync(path, buffer);
  return path;
}

export async function confirmDialog(page: Page, buttonName: string | RegExp) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: buttonName }).click();
  await expect(dialog).toBeHidden();
}
