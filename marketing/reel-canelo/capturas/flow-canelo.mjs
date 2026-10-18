// Capturas reales para la historia de Canelo (perdido → encontrado → coincidencia → chat con advertencia).
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const OUT = process.argv[2];
const BASE = "http://localhost:3000", PASS = "AyudaPatitas2026";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const now = new Date().toISOString();
async function user(email, name, commune) {
  const { data } = await sb.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { display_name: name } });
  const id = data?.user?.id ?? (await sb.from("profiles").select("id").eq("display_name", name).single()).data.id;
  await sb.from("profiles").update({ commune_code: commune, terms_accepted_at: now, adult_confirmed_at: now }).eq("id", id);
  return id;
}
await user("familia@ayudapatitas.test", "Familia Soto", "13119");
await user("rosa@ayudapatitas.test", "Rosa", "13119");

// Caballo de demostración para el filtro de especies
const FUND = "a0000000-0000-4000-8000-000000000002";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const art = await browser.newPage({ viewport: { width: 1200, height: 900 } });
async function photo(emoji, a, b, extra = "", file) {
  await art.setContent(`<div style="width:1200px;height:900px;background:radial-gradient(circle at 30% 25%,${a},${b});display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden"><div style="position:absolute;bottom:-140px;width:1000px;height:320px;border-radius:50%;background:rgba(255,255,255,.3)"></div><div style="font-size:470px;line-height:1;filter:drop-shadow(0 30px 40px rgba(0,0,0,.25))">${emoji}</div>${extra}</div>`);
  await art.screenshot({ path: file, type: "jpeg", quality: 88 });
  return file;
}
const { data: horse } = await sb.from("pets").insert({ owner_id: FUND, kind: "adoption", species: "horse", name: "Relámpago", sex: "male", size: "giant", birth_date_estimate: "2016-05-01", breed: "Criollo", color: "Alazán", description: "Relámpago fue rescatado de maltrato. Hoy está sano, es tranquilo y busca un campo donde vivir con cariño.", commune_code: "13401", vaccinated: true, dewormed: true, energy: "low" }).select("id").single();
if (horse) { const p = `${FUND}/${horse.id}/0.jpg`; await sb.storage.from("pet-photos").upload(p, readFileSync(await photo("🐴", "#fde68a", "#d97706", "", `${OUT}/horse.jpg`)), { contentType: "image/jpeg", upsert: true }); await sb.from("pet_photos").insert({ pet_id: horse.id, storage_path: p, position: 0 }); }

const canelo1 = await photo("🐕", "#fed7aa", "#ea580c", `<div style="position:absolute;top:70px;right:90px;font-size:110px">🧡</div>`, `${OUT}/canelo-1.jpg`);
const canelo2 = await photo("🐕", "#fde68a", "#f97316", `<div style="position:absolute;bottom:60px;left:90px;font-size:110px">🐾</div>`, `${OUT}/canelo-2.jpg`);
const rosaPhoto = await photo("🐕", "#e7e5e4", "#a8a29e", `<div style="position:absolute;top:80px;right:110px;font-size:120px">💤</div>`, `${OUT}/rosa-1.jpg`);

const device = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-CL", timezoneId: "America/Santiago" };
async function ctx(email) {
  const c = await browser.newContext(device); const p = await c.newPage();
  if (email) { await p.goto(BASE + "/ingresar"); await p.getByLabel("Correo electrónico").fill(email); await p.getByLabel("Contraseña", { exact: true }).fill(PASS); await p.getByRole("button", { name: "Ingresar" }).click(); await p.waitForURL((u) => !u.pathname.startsWith("/ingresar")); }
  return p;
}
async function shot(p, name, opts = {}) { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${name}.png`, ...opts }); console.log("shot", name); }
async function fillPet(p, { name, desc, photos, hint }) {
  await p.getByLabel("Nombre").fill(name);
  await p.getByText("Macho", { exact: true }).click();
  await p.getByLabel("Tamaño").selectOption("medium");
  await p.getByLabel("Descripción").fill(desc);
  await p.getByLabel("Región").selectOption("13");
  await p.getByLabel("Comuna").selectOption("13119");
  if (hint) await p.getByLabel("Sector de referencia").fill(hint);
  await p.locator('input[type="date"]').fill(new Date(Date.now() - 864e5).toISOString().slice(0, 10));
  await p.locator('input[type="file"]').setInputFiles(photos);
  await p.getByText("Portada").first().waitFor();
}

// 1. La familia publica a Canelo como perdido (y la app advierte si pone su teléfono)
const fam = await ctx("familia@ayudapatitas.test");
await fam.goto(BASE + "/publicar?tipo=lost&especie=perros");
await fillPet(fam, { name: "Canelo", desc: "Se arrancó anoche por el portón. Es canela, chico de tamaño mediano, con collar rojo. Muy amistoso. Llamar al +56 9 8765 4321", photos: [canelo1, canelo2], hint: "Cerca de la plaza del pasaje" });
await fam.getByText(/Parece que incluiste un teléfono/).scrollIntoViewIfNeeded();
await fam.evaluate(() => window.scrollBy(0, -260));
await shot(fam, "c-publicar-telefono");
await fam.evaluate(() => window.scrollTo(0, 0));
await shot(fam, "c-publicar-top");
await fam.getByLabel("Descripción").fill("Se arrancó anoche por el portón. Es canela, de tamaño mediano, con collar rojo. Muy amistoso. Escríbenos por el chat de la app.");
await fam.getByRole("button", { name: "Publicar", exact: true }).click();
await fam.waitForURL(/\/mascotas\/[0-9a-f-]{36}/, { timeout: 30000 });
const caneloUrl = fam.url().split("?")[0];

// Vista de otra persona: solo "Enviar mensaje", sin teléfono
const pedro = await ctx("pedro@ayudapatitas.test");
await pedro.goto(caneloUrl); await shot(pedro, "c-ficha-perdido");
await pedro.getByRole("button", { name: /Enviar mensaje|Tengo información|Lo vi/ }).first().scrollIntoViewIfNeeded().catch(() => {});
await shot(pedro, "c-ficha-perdido-boton");

// 2. Rosa lo encuentra y lo publica como encontrado
const rosa = await ctx("rosa@ayudapatitas.test");
await rosa.goto(BASE + "/publicar?tipo=found&especie=perros");
await fillPet(rosa, { name: "Sin nombre", desc: "Lo encontré durmiendo en mi felpudo esta mañana. Es canela, mediano, con collar rojo, muy cariñoso. Está conmigo en casa.", photos: [rosaPhoto], hint: "Pasaje cerca de la plaza" });
await rosa.evaluate(() => window.scrollTo(0, 0));
await shot(rosa, "c-publicar-encontrado");
await rosa.getByRole("button", { name: "Publicar", exact: true }).click();
await rosa.waitForURL(/\/mascotas\/[0-9a-f-]{36}/, { timeout: 30000 });
const foundUrl = rosa.url().split("?")[0];

// 3. A la familia le llega la coincidencia automática
await fam.goto(BASE + "/notificaciones"); await shot(fam, "c-notificacion");
await fam.goto(foundUrl); await shot(fam, "c-ficha-encontrado");

// 4. Chat: la app advierte cuando se habla de transferencias
await fam.locator('form:has(input[name="pet_id"]) button[type="submit"]').first().click();
await fam.waitForURL(/mensajes\//);
const chatUrl = fam.url();
await rosa.goto(chatUrl); await rosa.waitForTimeout(1500);
await fam.getByLabel("Escribe un mensaje").fill("¡Es mi Canelo! 😭 ¿Le transfiero algo por las molestias?");
await fam.waitForTimeout(700);
await shot(fam, "c-chat-advertencia");
await fam.getByLabel("Escribe un mensaje").press("Enter");
await rosa.waitForTimeout(1500);
await rosa.getByLabel("Escribe un mensaje").fill("¡Nada que ver! Venga a buscarlo no más 🐶");
await rosa.getByLabel("Escribe un mensaje").press("Enter");
await fam.waitForTimeout(2000);
await shot(fam, "c-chat-final");

// 5. Filtros por especie para "gatos, conejos, ¡hasta caballos!"
const guest = await ctx();
for (const [slug, n] of [["gatos", "gatos"], ["conejos", "conejos"], ["caballos", "caballos"]]) { await guest.goto(`${BASE}/mascotas?tipo=adopcion&especie=${slug}`); await shot(guest, "c-esp-" + n); }

// 6. Seguimiento con foto (vista superior)
const adop = await ctx("adoptante@ayudapatitas.test");
await adop.goto(BASE + "/seguimientos"); await adop.getByRole("link", { name: /1 semana/ }).click(); await adop.waitForLoadState("networkidle");
await shot(adop, "c-seguimiento");
await adop.screenshot({ path: `${OUT}/c-seguimiento-full.png`, fullPage: true });
await browser.close();
