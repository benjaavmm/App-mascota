"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { parseAlertCriteria } from "@/lib/alerts";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { formObject, type ActionState } from "@/lib/validation";

export async function createAlert(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa para crear alertas." };

  const criteria = parseAlertCriteria(formObject(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("pet_alerts").insert(criteria);
  if (error?.code === "23505") {
    return { ok: true, message: "Ya tenías esta alerta. Te avisaremos apenas aparezca una coincidencia." };
  }
  if (error) return { error: friendlyError(error) };

  revalidatePath("/alertas");
  return {
    ok: true,
    message: "¡Alerta creada! Te avisaremos en tus notificaciones cuando publiquen una coincidencia.",
  };
}

export async function deleteAlert(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const user = await getCurrentUser();
  if (!user || !isUuid(id)) return;

  const supabase = await createClient();
  await supabase.from("pet_alerts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/alertas");
}
