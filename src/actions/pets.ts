"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { isoDateFromAge } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { petSchema, formObject, validationError, type ActionState, type PetInput } from "@/lib/validation";
import { Constants, type TablesUpdate } from "@/types/database";

function toPetRow(d: PetInput) {
  const isAdoption = d.kind === "adoption";
  return {
    name: d.name,
    sex: d.sex,
    size: d.size,
    birth_date_estimate: d.age_unknown ? null : isoDateFromAge(d.age_years, d.age_months),
    breed: d.breed,
    color: d.color,
    weight_kg: d.weight_kg,
    description: d.description,
    energy: d.energy,
    good_with_kids: d.good_with_kids,
    good_with_dogs: d.good_with_dogs,
    good_with_cats: d.good_with_cats,
    vaccinated: d.vaccinated,
    dewormed: d.dewormed,
    sterilized: d.sterilized,
    microchipped: d.microchipped,
    special_needs: d.special_needs,
    health_notes: d.health_notes,
    requirements: isAdoption ? d.requirements : null,
    commune_code: d.commune_code,
    location_hint: isAdoption ? null : d.location_hint,
    event_date: isAdoption ? null : d.event_date,
    is_urgent: d.is_urgent,
  } satisfies TablesUpdate<"pets">;
}

export type CreatePetState = ActionState & { id?: string };

// Crea la publicación. Las fotos se suben después desde el navegador (directo a Storage).
export async function createPet(_prev: CreatePetState, formData: FormData): Promise<CreatePetState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const values = formObject(formData);
  const parsed = petSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pets")
    .insert({ kind: parsed.data.kind, ...toPetRow(parsed.data) })
    .select("id")
    .single();

  if (error || !data) return { error: friendlyError(error), values };
  revalidatePath("/mascotas");
  return { ok: true, id: data.id };
}

export async function updatePet(petId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isUuid(petId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("pets")
    .select("kind, owner_id")
    .eq("id", petId)
    .maybeSingle();
  if (!current || current.owner_id !== user.id) return { error: "Publicación no encontrada." };

  const values = { ...formObject(formData), kind: current.kind };
  const parsed = petSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const { error } = await supabase
    .from("pets")
    .update(toPetRow(parsed.data))
    .eq("id", petId)
    .eq("owner_id", user.id);
  if (error) return { error: friendlyError(error), values };

  revalidatePath(`/mascotas/${petId}`);
  refresh();
  return { ok: true, message: "Cambios guardados." };
}

const OWNER_STATUSES = ["available", "paused", "archived", "adopted", "reunited"] as const;

export async function setPetStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const petId = String(formData.get("pet_id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof Constants.public.Enums.pet_status)[number];
  if (!isUuid(petId) || !(OWNER_STATUSES as readonly string[]).includes(status)) {
    return { error: "Acción no válida." };
  }
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pets")
    .update({ status })
    .eq("id", petId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: friendlyError(error) };
  if (!data) return { error: "Publicación no encontrada." };

  revalidatePath("/mascotas");
  refresh();
  return { ok: true, message: "Estado actualizado." };
}

export async function toggleFavorite(petId: string): Promise<{ favorite?: boolean; error?: string }> {
  if (!isUuid(petId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa para guardar favoritos." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("pet_id")
    .eq("user_id", user.id)
    .eq("pet_id", petId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("pet_id", petId);
    if (error) return { error: friendlyError(error) };
    return { favorite: false };
  }

  const { error } = await supabase.from("favorites").insert({ pet_id: petId });
  if (error) return { error: friendlyError(error) };
  return { favorite: true };
}

// Abre (o recupera) la conversación con quien publicó y lleva al chat.
export async function contactAboutPet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const petId = String(formData.get("pet_id") ?? "");
  if (!isUuid(petId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/mascotas/${petId}`)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_pet_id: petId });
  if (error || !data) {
    if (error?.message?.includes("Completa tu perfil")) redirect(`/bienvenida?next=/mascotas/${petId}`);
    return { error: friendlyError(error) };
  }
  redirect(`/mensajes/${data}`);
}
