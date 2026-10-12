"use server";

import { refresh } from "next/cache";

import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { Constants } from "@/types/database";

// Todas estas acciones llaman a funciones de la base de datos que verifican el rol de
// moderación y registran la acción en audit_log. La verificación aquí es solo de formato.

const E = Constants.public.Enums;
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim() || undefined;

export async function resolveReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof E.report_status)[number];
  if (!isUuid(id) || !E.report_status.includes(status)) return { error: "Acción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", {
    p_report_id: id,
    p_status: status,
    p_note: text(formData, "note"),
  });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function moderatePetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("pet_id") ?? "");
  const hide = formData.get("hide") === "1";
  if (!isUuid(id)) return { error: "Acción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_pet", {
    p_pet_id: id,
    p_hide: hide,
    p_reason: text(formData, "reason"),
  });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function setAccountStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof E.account_status)[number];
  if (!isUuid(id) || !E.account_status.includes(status)) return { error: "Acción no válida." };
  const days = Number(formData.get("days"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_status", {
    p_user_id: id,
    p_status: status,
    p_reason: text(formData, "reason") ?? "",
    p_days: status === "suspended" && Number.isFinite(days) ? days : undefined,
  });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function setUserRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as (typeof E.user_role)[number];
  if (!isUuid(id) || !E.user_role.includes(role)) return { error: "Acción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: id, p_role: role });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function reviewVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("request_id") ?? "");
  const approve = formData.get("approve") === "1";
  if (!isUuid(id)) return { error: "Acción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_verification", {
    p_request_id: id,
    p_approve: approve,
    p_note: text(formData, "note"),
  });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}
