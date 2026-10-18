// Recorre la app real con las cuentas de demo y toma capturas de celular para el reel.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const OUT = process.argv[2];
const BASE = "http://localhost:3000";
const PASS = "AyudaPatitas2026";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const ids = Object.fromEntries(((await sb.from("pets").select("id,name")).data ?? []).map((p) => [p.name, p.id]));

// Cuenta "desconocida" para mostrar la advertencia de estafa.
const { data: created } = await sb.auth.admin.createUser({ email: "pedro@ayudapatitas.test", password: PASS, email_confirm: true, user_metadata: { display_name: "Pedro" } });
if (created?.user) await sb.from("profiles").update({ commune_code: "13110", terms_accepted_at: new Date().toISOString(), adult_confirmed_at: new Date().toISOString() }).eq("id", created.user.id);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const device = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-CL", timezoneId: "America/Santiago" };
async function ctx(email) {
  const c = await browser.newContext(device);
  const p = await c.newPage();
  if (email) {
    await p.goto(BASE + "/ingresar");
    await p.getByLabel("Correo electrónico").fill(email);
    await p.getByLabel("Contraseña", { exact: true }).fill(PASS);
    await p.getByRole("button", { name: "Ingresar" }).click();
    await p.waitForURL((u) => !u.pathname.startsWith("/ingresar"));
  }
  return p;
}
async function shot(p, name, { full = false } = {}) {
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("shot", name);
}

// Visitante
const guest = await ctx();
await guest.goto(BASE + "/"); await shot(guest, "home"); await shot(guest, "home-full", { full: true });
await guest.goto(BASE + "/mascotas?tipo=adopcion"); await shot(guest, "listado"); await shot(guest, "listado-full", { full: true });
await guest.goto(BASE + "/mascotas?tipo=adopcion&especie=gatos"); await shot(guest, "listado-gatos");
await guest.goto(BASE + "/mascotas?tipo=perdidos"); await shot(guest, "listado-perdidos");
await guest.goto(BASE + "/mascotas/" + ids["Luna"]); await shot(guest, "ficha-luna"); await shot(guest, "ficha-luna-full", { full: true });
await guest.goto(BASE + "/mascotas/" + ids["Simba"]); await shot(guest, "ficha-simba");

// Quien adopta: notificación de su alerta, alertas, postulación
const adop = await ctx("adoptante@ayudapatitas.test");
await adop.goto(BASE + "/notificaciones"); await shot(adop, "notificaciones");
await adop.goto(BASE + "/alertas"); await shot(adop, "alertas");
await adop.goto(BASE + "/mascotas/" + ids["Luna"]); await shot(adop, "ficha-luna-logueado");
await adop.getByRole("link", { name: "Quiero adoptar" }).click();
await adop.waitForURL(/postular/); await shot(adop, "postular"); await shot(adop, "postular-full", { full: true });
await adop.getByText("Departamento", { exact: true }).click();
await adop.getByRole("group", { name: /La vivienda es/ }).getByText("Arrendada").click();
await adop.getByRole("group", { name: /arriendo/ }).getByText("Sí").click();
await adop.getByRole("group", { name: /patio/ }).getByText("No").click();
await adop.getByLabel("Adultos en el hogar").fill("2");
await adop.getByLabel(/Todas las personas con las que vivo/).check();
await adop.getByLabel(/Cuántas horas al día/).fill("3");
await adop.getByLabel("¿Qué experiencia tienes cuidando animales?").fill("Crecí con gatos rescatados y siempre los llevé al veterinario.");
await adop.getByLabel(/Por qué quieres adoptar/).fill("Trabajo desde casa, tengo un departamento tranquilo y quiero darle a Luna un hogar para siempre, con mucho cariño.");
await adop.getByLabel(/vacaciones, mudanzas/).fill("Mi hermana vive cerca y la cuidaría si viajo.");
for (const l of [/atención veterinaria/, /esterilizarla/, /seguimientos/, /Nunca la abandonaré/]) await adop.getByLabel(l).check();
await shot(adop, "postular-lleno");
await adop.getByRole("button", { name: "Enviar solicitud" }).click();
await adop.waitForURL(/solicitudes\/[0-9a-f-]{36}/); await shot(adop, "solicitud-enviada");
const appUrl = adop.url().split("?")[0];

// Chat amable entre adoptante y fundación
await adop.getByRole("link", { name: "Ir al chat" }).first().click();
await adop.waitForURL(/mensajes\//);
const chatUrl = adop.url();
const fund = await ctx("fundacion@ayudapatitas.test");
await fund.goto(chatUrl); await fund.waitForTimeout(1500);
await adop.getByLabel("Escribe un mensaje").fill("¡Hola! Me encantó Luna 😍 ¿Cuándo podría conocerla?");
await adop.getByLabel("Escribe un mensaje").press("Enter");
await fund.waitForTimeout(1200);
await fund.getByLabel("Escribe un mensaje").fill("¡Hola Diego! Qué lindo leerte. ¿Te acomoda este sábado a las 11 en la fundación?");
await fund.getByLabel("Escribe un mensaje").press("Enter");
await adop.waitForTimeout(1500);
await adop.getByLabel("Escribe un mensaje").fill("¡Perfecto! Ahí estaré 🙌");
await adop.getByLabel("Escribe un mensaje").press("Enter");
await adop.waitForTimeout(1500);
await shot(adop, "chat-amable");
await shot(fund, "chat-amable-fundacion");

// Estafa típica con una mascota perdida
const pedro = await ctx("pedro@ayudapatitas.test");
await pedro.goto(BASE + "/mascotas/" + ids["Simba"]);
await pedro.locator('form:has(input[name="pet_id"]) button[type="submit"]').first().click();
await pedro.waitForURL(/mensajes\//);
const scamUrl = pedro.url();
await pedro.getByLabel("Escribe un mensaje").fill("Tengo a tu perro. Transfiere $30.000 a mi cuenta y te lo devuelvo hoy.");
await pedro.waitForTimeout(600);
await shot(pedro, "estafa-emisor");
await pedro.getByLabel("Escribe un mensaje").press("Enter");
const resc = await ctx("rescatista@ayudapatitas.test");
await resc.goto(scamUrl); await resc.waitForTimeout(1500);
await shot(resc, "estafa-receptor");

// Aprobación, acta y adopción
await fund.goto(appUrl); await shot(fund, "solicitud-recibida"); await shot(fund, "solicitud-recibida-full", { full: true });
await fund.getByRole("button", { name: "Aprobar solicitud" }).click();
await fund.getByRole("dialog").getByRole("button", { name: "Aprobar" }).click();
await fund.getByRole("dialog").waitFor({ state: "hidden" });
await fund.getByRole("link", { name: "Acta de adopción" }).click();
await fund.waitForURL(/acta/); await shot(fund, "acta"); await shot(fund, "acta-full", { full: true });
await fund.goto(appUrl);
await fund.getByRole("button", { name: "Confirmar adopción" }).click();
await fund.getByRole("dialog").getByLabel(/Confirmo que la entrega se realizó/).check();
await fund.getByRole("dialog").getByRole("button", { name: "Confirmar entrega" }).click();
await fund.getByRole("dialog").waitFor({ state: "hidden" });
await shot(fund, "adopcion-concretada");

// Seguimiento con foto (ilustrada)
const photoPage = await browser.newPage({ viewport: { width: 1000, height: 750 } });
await photoPage.setContent(`<div style="width:1000px;height:750px;background:radial-gradient(circle at 30% 30%,#fef3c7,#fb923c);display:flex;align-items:center;justify-content:center;font-size:380px">🐱🛋️</div>`);
const photoPath = `${OUT}/seguimiento.jpg`;
await photoPage.screenshot({ path: photoPath, type: "jpeg", quality: 85 });
await adop.goto(BASE + "/seguimientos"); await shot(adop, "seguimientos");
await adop.getByRole("link", { name: /1 semana/ }).click();
await adop.getByText("¡Feliz!", { exact: true }).click();
await adop.getByLabel("Cuéntanos cómo ha sido").fill("Luna ya es la reina de la casa. Duerme al sol en el sillón y ronronea todo el día.");
await adop.locator('input[type="file"]').setInputFiles(photoPath);
await adop.waitForTimeout(800);
await adop.getByRole("button", { name: "Enviar seguimiento" }).click();
await adop.getByRole("heading", { name: /Enviado el/ }).waitFor();
await shot(adop, "seguimiento-enviado");

// Publicar (formulario) y adoptados
await fund.goto(BASE + "/publicar?especie=gatos"); await shot(fund, "publicar");
await guest.goto(BASE + "/adoptados"); await shot(guest, "adoptados");
await guest.goto(BASE + "/seguridad"); await shot(guest, "seguridad");
await browser.close();
