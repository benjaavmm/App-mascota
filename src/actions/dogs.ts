"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { isoDateFromAge } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { dogSchema, formObject, validationError, type ActionState, type DogInput } from "@/lib/validation";
import { Constants, type TablesUpdate } from "@/types/database";

function toDogRow(d: DogInput) {
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
  } satisfies TablesUpdate<"dogs">;
}

export type CreateDogState = ActionState & { id?: string };

// Crea la publicación. Las fotos se suben después desde el navegador (directo a Storage).
export async function createDog(_prev: CreateDogState, formData: FormData): Promise<CreateDogState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const values = formObject(formData);
  const parsed = dogSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .insert({ kind: parsed.data.kind, ...toDogRow(parsed.data) })
    .select("id")
    .single();

  if (error || !data) return { error: friendlyError(error), values };
  revalidatePath("/perritos");
  return { ok: true, id: data.id };
}

export async function updateDog(dogId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isUuid(dogId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("dogs")
    .select("kind, owner_id")
    .eq("id", dogId)
    .maybeSingle();
  if (!current || current.owner_id !== user.id) return { error: "Publicación no encontrada." };

  const values = { ...formObject(formData), kind: current.kind };
  const parsed = dogSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const { error } = await supabase
    .from("dogs")
    .update(toDogRow(parsed.data))
    .eq("id", dogId)
    .eq("owner_id", user.id);
  if (error) return { error: friendlyError(error), values };

  revalidatePath(`/perritos/${dogId}`);
  refresh();
  return { ok: true, message: "Cambios guardados." };
}

const OWNER_STATUSES = ["available", "paused", "archived", "adopted", "reunited"] as const;

export async function setDogStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const dogId = String(formData.get("dog_id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof Constants.public.Enums.dog_status)[number];
  if (!isUuid(dogId) || !(OWNER_STATUSES as readonly string[]).includes(status)) {
    return { error: "Acción no válida." };
  }
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dogs")
    .update({ status })
    .eq("id", dogId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: friendlyError(error) };
  if (!data) return { error: "Publicación no encontrada." };

  revalidatePath("/perritos");
  refresh();
  return { ok: true, message: "Estado actualizado." };
}

export async function toggleFavorite(dogId: string): Promise<{ favorite?: boolean; error?: string }> {
  if (!isUuid(dogId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa para guardar favoritos." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("dog_id")
    .eq("user_id", user.id)
    .eq("dog_id", dogId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("dog_id", dogId);
    if (error) return { error: friendlyError(error) };
    return { favorite: false };
  }

  const { error } = await supabase.from("favorites").insert({ dog_id: dogId });
  if (error) return { error: friendlyError(error) };
  return { favorite: true };
}

// Abre (o recupera) la conversación con quien publicó y lleva al chat.
export async function contactAboutDog(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const dogId = String(formData.get("dog_id") ?? "");
  if (!isUuid(dogId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/perritos/${dogId}`)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_dog_id: dogId });
  if (error || !data) {
    if (error?.message?.includes("Completa tu perfil")) redirect(`/bienvenida?next=/perritos/${dogId}`);
    return { error: friendlyError(error) };
  }
  redirect(`/mensajes/${data}`);
}
