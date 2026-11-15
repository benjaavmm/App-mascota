"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { adoptionFormSchema, formObject, validationError, type ActionState } from "@/lib/validation";

// Guarda el formulario de adopción propio (preguntas extra o enlace a un formulario externo).
export async function saveAdoptionForm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a ingresar." };

  const values = formObject(formData);
  const parsed = adoptionFormSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { mode, external_url, intro, questions } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_adoption_form", {
    p_external_url: mode === "external" ? (external_url ?? "") : "",
    p_intro: intro ?? "",
    p_questions: mode === "app" ? questions : [],
  });
  if (error) return { error: friendlyError(error), values };

  revalidatePath("/mis-publicaciones/formulario");
  return {
    ok: true,
    message:
      mode === "external"
        ? "¡Listo! Quienes postulen a tus mascotas verán el enlace a tu formulario."
        : "¡Listo! Tus preguntas ya aparecen en el cuestionario de tus mascotas.",
  };
}
