import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/database";

// Cliente con privilegios totales. Ignora RLS: úsalo solo en el servidor y solo
// para tareas que una persona no puede hacer por sí misma (eliminar su cuenta).
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return null;
  }
  return createClient<Database>(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Cliente aislado (sin cookies) para verificar una contraseña sin tocar la sesión actual.
export function createVerifierClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
