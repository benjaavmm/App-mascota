"use server";

import { getCurrentUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSubscription(sub: Sub, userAgent: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Ingresa para activar las notificaciones." };
  const { endpoint, keys } = sub ?? {};
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys?.auth)
    return { error: "Suscripción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: userAgent.slice(0, 300),
  });
  return error ? { error: friendlyError(error) } : { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  const user = await getCurrentUser();
  if (!user || typeof endpoint !== "string") return { error: "Acción no válida." };
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true };
}
