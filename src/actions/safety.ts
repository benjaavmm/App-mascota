"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { formObject, reportSchema, validationError, type ActionState } from "@/lib/validation";

export async function createReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa para enviar un reporte." };

  const parsed = reportSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const { target_type, target_id, reason, details } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    target_type,
    reason,
    details,
    pet_id: target_type === "pet" ? target_id : null,
    reported_user_id: target_type === "user" ? target_id : null,
    message_id: target_type === "message" ? target_id : null,
  });
  if (error) return { error: friendlyError(error) };

  return {
    ok: true,
    message:
      "Gracias por avisarnos. Moderación revisará el reporte. Si hay un animal en peligro inmediato, llama al 133 (Carabineros).",
  };
}

export async function blockUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = String(formData.get("user_id") ?? "");
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa para bloquear." };
  if (!isUuid(userId) || userId === user.id) return { error: "Persona no válida." };

  const supabase = await createClient();
  const { error } = await supabase.from("blocks").insert({ blocked_id: userId });
  if (error && error.code !== "23505") return { error: friendlyError(error) };
  refresh();
  return {
    ok: true,
    message: "Bloqueaste a esta persona. Ya no podrán escribirse ni postular entre ustedes.",
  };
}

export async function unblockUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = String(formData.get("user_id") ?? "");
  const user = await getCurrentUser();
  if (!user || !isUuid(userId)) return { error: "Acción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true, message: "Desbloqueaste a esta persona." };
}
