import "server-only";

import type { AdoptionFormConfig, FormQuestion } from "@/lib/forms";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Formulario de adopción de quien publica la mascota (por defecto, solo el cuestionario de AyudaPatitas).
export async function getPublisherForm(supabase: Client, petId: string): Promise<AdoptionFormConfig> {
  const { data: pet } = await supabase.from("pets").select("owner_id").eq("id", petId).maybeSingle();
  return pet ? getOwnerForm(supabase, pet.owner_id) : { externalUrl: null, intro: null, questions: [] };
}

export async function getOwnerForm(supabase: Client, ownerId: string): Promise<AdoptionFormConfig> {
  const [{ data: form }, { data: questions }] = await Promise.all([
    supabase.from("adoption_forms").select("external_url, intro").eq("owner_id", ownerId).maybeSingle(),
    supabase
      .from("adoption_form_questions")
      .select("id, label, kind, options, required")
      .eq("owner_id", ownerId)
      .order("position"),
  ]);
  return {
    externalUrl: form?.external_url ?? null,
    intro: form?.intro ?? null,
    questions: (questions ?? []).map((q) => ({ ...q, kind: q.kind as FormQuestion["kind"] })),
  };
}
