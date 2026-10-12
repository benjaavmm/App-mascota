// Une todas las migraciones en supabase/instalar_todo.sql, para instalarlas
// desde el SQL Editor de Supabase sin usar la CLI (por ejemplo, desde el celular).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = "supabase/migrations";
const header = `-- =============================================================================
-- AyudaPatitas · Instalación completa para un proyecto NUEVO de Supabase
-- Pega todo este archivo en Supabase → SQL Editor → New query y toca Run.
-- Es la unión, en orden, de los archivos de supabase/migrations (generado con
-- npm run db:bundle). No incluye datos de ejemplo.
-- =============================================================================
`;
const parts = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => `\n-- >>> ${f}\n${readFileSync(`${dir}/${f}`, "utf8")}`);
writeFileSync("supabase/instalar_todo.sql", header + parts.join(""));
console.log("supabase/instalar_todo.sql actualizado");
