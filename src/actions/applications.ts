"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getPublisherForm } from "@/lib/adoption-form";
import type { AdoptionFormConfig } from "@/lib/forms";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { TablesInsert } from "@/types/database";
import {
  applicationSchema,
  decisionSchema,
  externalApplicationSchema,
  followupSchema,
  formObject,
  validationError,
  type ActionState,
} from "@/lib/validation";

const SESSION_EXPIRED: ActionState = { error: "Tu sesión expiró. Vuelve a ingresar." };

// Revisa las respuestas a las preguntas propias de quien publica (campos "q_<id>").
function checkCustomAnswers(questions: AdoptionFormConfig["questions"], values: Record<string, string>) {
  const byId: Record<string, string> = {};
  const errors: Record<string, string[]> = {};
  for (const q of questions) {
    const answer = (values[`q_${q.id}`] ?? "").trim();
    if (!answer) {
      if (q.required) errors[`q_${q.id}`] = ["Esta pregunta es obligatoria."];
      continue;
    }
    const max = q.kind === "long" ? 1500 : 300;
    if (answer.length > max) errors[`q_${q.id}`] = [`Máximo ${max} caracteres.`];
    else if (q.kind === "yesno" && answer !== "Sí" && answer !== "No")
      errors[`q_${q.id}`] = ["Elige Sí o No."];
    else if (q.kind === "choice" && !q.options?.includes(answer)) errors[`q_${q.id}`] = ["Elige una opción."];
    else byId[q.id] = answer;
  }
  return { byId, errors };
}

export async function submitApplication(
  petId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isUuid(petId)) return { error: "Publicación no válida." };
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const values = formObject(formData);
  const supabase = await createClient();
  const form = await getPublisherForm(supabase, petId);

  let row: TablesInsert<"applications">;
  if (form.externalUrl) {
    const parsed = externalApplicationSchema.safeParse(values);
    if (!parsed.success) return validationError(parsed.error, values);
    row = { pet_id: petId, ...parsed.data } as TablesInsert<"applications">;
  } else {
    const parsed = applicationSchema.safeParse(values);
    const answers = checkCustomAnswers(form.questions, values);
    if (!parsed.success || Object.keys(answers.errors).length) {
      return {
        error: "Revisa los campos marcados.",
        fieldErrors: {
          ...(parsed.success ? {} : (validationError(parsed.error).fieldErrors ?? {})),
          ...answers.errors,
        },
        values,
      };
    }
    row = { pet_id: petId, ...parsed.data, custom_answers: answers.byId } as TablesInsert<"applications">;
  }

  const { data, error } = await supabase
    .from("applications")
    // publisher_id, applicant_id y conversation_id los asigna un trigger de la base de datos,
    // que también valida las respuestas a las preguntas propias de quien publica.
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return { error: friendlyError(error), values };

  revalidatePath(`/mascotas/${petId}`);
  redirect(`/solicitudes/${data.id}?enviada=1`);
}

export async function reviewApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const applicationId = String(formData.get("application_id") ?? "");
  if (!isUuid(applicationId)) return { error: "Solicitud no válida." };

  const parsed = decisionSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  if (parsed.data.status === "rejected" && !parsed.data.message) {
    return { error: "Escribe un mensaje amable explicando el motivo. Ayuda a quien postuló." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_application", {
    p_application_id: applicationId,
    p_status: parsed.data.status,
    p_message: parsed.data.message ?? undefined,
  });
  if (error) return { error: friendlyError(error) };

  refresh();
  return { ok: true };
}

export async function withdrawApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const applicationId = String(formData.get("application_id") ?? "");
  if (!isUuid(applicationId)) return { error: "Solicitud no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_application", { p_application_id: applicationId });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true };
}

export async function completeAdoption(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const applicationId = String(formData.get("application_id") ?? "");
  if (!isUuid(applicationId)) return { error: "Solicitud no válida." };
  if (formData.get("handover_confirmed") !== "on") {
    return { error: "Confirma que la entrega se realizó y que revisaron el acta de adopción." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_adoption", { p_application_id: applicationId });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/adoptados");
  refresh();
  return { ok: true };
}

export async function submitFollowup(
  followupId: string,
  photoPath: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  if (!isUuid(followupId)) return { error: "Seguimiento no válido." };

  const values = formObject(formData);
  const parsed = followupSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  if (photoPath && !photoPath.startsWith(`${user.id}/${followupId}/`)) return { error: "Foto no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_followup", {
    p_followup_id: followupId,
    p_wellbeing: parsed.data.wellbeing,
    p_notes: parsed.data.notes,
    p_photo_path: photoPath ?? undefined,
  });
  if (error) return { error: friendlyError(error), values };
  refresh();
  return { ok: true, message: "¡Gracias! Enviamos tu seguimiento." };
}

export async function commentFollowup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const followupId = String(formData.get("followup_id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!isUuid(followupId)) return { error: "Seguimiento no válido." };
  if (comment.length < 2) return { error: "Escribe un comentario." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("comment_followup", {
    p_followup_id: followupId,
    p_comment: comment.slice(0, 1000),
  });
  if (error) return { error: friendlyError(error) };
  refresh();
  return { ok: true, message: "Comentario enviado." };
}
