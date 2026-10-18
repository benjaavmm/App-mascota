// Datos de demostración para grabar el reel (solo local). Fotos = ilustraciones con emoji, no animales reales.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const FUND = "a0000000-0000-4000-8000-000000000002", RESC = "a0000000-0000-4000-8000-000000000003", ADOP = "a0000000-0000-4000-8000-000000000004";
const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

const PETS = [
  { owner: FUND, kind: "adoption", species: "cat", name: "Luna", sex: "female", size: "small", age: 730, breed: "Mestiza", color: "Gris atigrada", commune: "13120", emoji: "🐱", bg: ["#fde68a", "#fb923c"], urgent: false, desc: "Luna llegó a la fundación después de vivir en un estacionamiento. Es regalona, tranquila y ama dormir al sol. Ideal para departamento." },
  { owner: FUND, kind: "adoption", species: "dog", name: "Toby", sex: "male", size: "medium", age: 1095, breed: "Mestizo", color: "Café con blanco", commune: "13101", emoji: "🐶", bg: ["#bfdbfe", "#60a5fa"], urgent: false, desc: "Toby es juguetón y muy sociable. Se lleva excelente con niños y otros perros. Busca una familia activa que lo saque a pasear." },
  { owner: FUND, kind: "adoption", species: "dog", name: "Rocky", sex: "male", size: "large", age: 2555, breed: "Mestizo tipo pastor", color: "Negro con fuego", commune: "13119", emoji: "🐕", bg: ["#fecaca", "#f87171"], urgent: true, desc: "Rocky es un abuelito noble que pasó años en la calle. Necesita con urgencia un hogar tranquilo donde descansar y recibir cariño." },
  { owner: FUND, kind: "adoption", species: "rabbit", name: "Copito", sex: "male", size: "small", age: 365, breed: "Mestizo", color: "Blanco", commune: "13123", emoji: "🐰", bg: ["#e9d5ff", "#c084fc"], urgent: false, desc: "Copito fue abandonado en una plaza. Es curioso y limpio, usa su bandeja y le encanta comer hojas de zanahoria." },
  { owner: RESC, kind: "adoption", species: "cat", name: "Mostaza", sex: "male", size: "medium", age: 1460, breed: "Mestizo", color: "Naranjo", commune: "05101", emoji: "🐈", bg: ["#fed7aa", "#f97316"], urgent: false, desc: "Mostaza es un gato tranquilo y conversador. Está esterilizado, vacunado y busca un hogar sin otros gatos dominantes." },
  { owner: RESC, kind: "adoption", species: "bird", name: "Pipo", sex: "unknown", size: "small", age: 540, breed: "Periquito", color: "Verde y amarillo", commune: "05109", emoji: "🦜", bg: ["#bbf7d0", "#4ade80"], urgent: false, desc: "Pipo es un periquito rescatado de una casa abandonada. Es sociable, canta en las mañanas y viene con su jaula." },
  { owner: FUND, kind: "adoption", species: "rodent", name: "Maní", sex: "female", size: "small", age: 300, breed: "Cuy", color: "Café y blanco", commune: "13201", emoji: "🐹", bg: ["#fef3c7", "#fbbf24"], urgent: false, desc: "Maní es una cuy muy dulce que busca hogar junto a su hermana. Son tranquilas y les encanta el pasto fresco." },
  { owner: RESC, kind: "adoption", species: "dog", name: "Canela", sex: "female", size: "small", age: 120, breed: "Mestiza", color: "Canela", commune: "08101", emoji: "🐶", bg: ["#ccfbf1", "#2dd4bf"], urgent: true, desc: "Canela es una cachorrita de cuatro meses rescatada de la lluvia. Juguetona, sana y lista para su primera vacuna completa." },
  { owner: RESC, kind: "lost", species: "dog", name: "Simba", sex: "male", size: "medium", age: 1825, breed: "Golden mestizo", color: "Dorado", commune: "13110", emoji: "🐕‍🦺", bg: ["#fde68a", "#f59e0b"], urgent: true, event: 2, desc: "Se perdió el sábado cerca de la plaza. Tiene collar rojo y es muy amistoso. Responde a su nombre. Por favor avisar por el chat." },
  { owner: FUND, kind: "found", species: "cat", name: "Sin nombre", sex: "female", size: "small", age: null, breed: "Mestiza", color: "Blanca con manchas negras", commune: "13120", emoji: "🐈‍⬛", bg: ["#e0e7ff", "#818cf8"], urgent: false, event: 1, desc: "La encontramos en el pasaje de una villa en Ñuñoa, asustada pero sana. Tiene collar sin placa. Está resguardada en hogar temporal." },
];

// 1. Fotos ilustradas
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
async function photo(p, variant) {
  const [a, b] = p.bg;
  await page.setContent(`<div style="width:1200px;height:900px;background:radial-gradient(circle at ${variant ? "70% 30%" : "30% 25%"},${a},${b});display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
    <div style="position:absolute;bottom:-120px;width:900px;height:300px;border-radius:50%;background:rgba(255,255,255,.35)"></div>
    <div style="font-size:${variant ? 420 : 480}px;line-height:1;transform:rotate(${variant ? 6 : -4}deg);filter:drop-shadow(0 30px 40px rgba(0,0,0,.25))">${p.emoji}</div>
    <div style="position:absolute;top:60px;right:80px;font-size:120px;opacity:.5">${variant ? "💛" : "🐾"}</div></div>`);
  return page.screenshot({ type: "jpeg", quality: 85 });
}

// 2. Limpia las publicaciones del seed y crea una alerta para quien adopta.
await sb.from("pets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
await sb.from("pet_alerts").insert({ user_id: ADOP, kind: "adoption", species: "cat", region_code: "13", commune_code: "13120" });

for (const p of PETS) {
  const { data: pet, error } = await sb.from("pets").insert({
    owner_id: p.owner, kind: p.kind, species: p.species, name: p.name, sex: p.sex, size: p.size,
    birth_date_estimate: p.age ? daysAgo(p.age) : null, breed: p.breed, color: p.color, description: p.desc,
    commune_code: p.commune, is_urgent: p.urgent, vaccinated: p.kind === "adoption", dewormed: p.kind === "adoption",
    sterilized: p.kind === "adoption" && p.age > 200, good_with_kids: true, event_date: p.event ? daysAgo(p.event) : null,
    energy: "medium",
  }).select("id").single();
  if (error) throw new Error(p.name + ": " + error.message);
  for (const v of [0, 1]) {
    const path = `${p.owner}/${pet.id}/${v}.jpg`;
    const { error: upErr } = await sb.storage.from("pet-photos").upload(path, await photo(p, v), { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error("upload " + upErr.message);
    const { error: phErr } = await sb.from("pet_photos").insert({ pet_id: pet.id, storage_path: path, position: v });
    if (phErr) throw new Error("photo " + phErr.message);
  }
  console.log("ok", p.name, pet.id);
}
await browser.close();
