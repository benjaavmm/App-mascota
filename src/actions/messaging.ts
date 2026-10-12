"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";

export async function shareContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };
  const conversationId = String(formData.get("conversation_id") ?? "");
  if (!isUuid(conversationId)) return { error: "Conversación no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("share_contact", { p_conversation_id: conversationId });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}
