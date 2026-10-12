import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

// Marca la notificación como leída y lleva a su destino.
export async function GET(_request: NextRequest, { params }: RouteContext<"/notificaciones/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) redirect("/notificaciones");

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("link")
    .maybeSingle();

  redirect(safeNext(data?.link, "/notificaciones"));
}
