"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, safeNext } from "@/lib/auth";
import { friendlyAuthError, friendlyError } from "@/lib/errors";
import { createAdminClient, createVerifierClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  formObject,
  newPasswordSchema,
  onboardingSchema,
  profileSchema,
  validationError,
  verificationSchema,
  type ActionState,
} from "@/lib/validation";

const SESSION_EXPIRED: ActionState = { error: "Tu sesión expiró. Vuelve a ingresar." };

export async function completeOnboarding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const values = formObject(formData);
  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const d = parsed.data;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.display_name,
      account_type: d.account_type,
      commune_code: d.commune_code,
      terms_accepted_at: now,
      adult_confirmed_at: now,
    })
    .eq("id", user.id);
  if (error) return { error: friendlyError(error), values };

  const { error: privateError } = await supabase
    .from("profile_private")
    .update({ phone: d.phone })
    .eq("user_id", user.id);
  if (privateError) return { error: friendlyError(privateError), values };

  redirect(safeNext(values.next, "/"));
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const values = formObject(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { phone, ...publicData } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(publicData).eq("id", user.id);
  if (error) return { error: friendlyError(error), values };

  const { error: privateError } = await supabase
    .from("profile_private")
    .update({ phone })
    .eq("user_id", user.id);
  if (privateError) return { error: friendlyError(privateError), values };

  refresh();
  return { ok: true, message: "Perfil actualizado." };
}

export async function updateAvatar(path: string | null): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  if (path !== null && !path.startsWith(`${user.id}/`)) return { error: "Archivo no válido." };

  const supabase = await createClient();
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { error: friendlyError(error) };

  if (current?.avatar_path && current.avatar_path !== path) {
    await supabase.storage.from("avatars").remove([current.avatar_path]);
  }
  refresh();
  return {};
}

export async function requestVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const values = formObject(formData);
  const parsed = verificationSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const documentPath = values.document_path || null;
  if (documentPath && !documentPath.startsWith(`${user.id}/`)) return { error: "Documento no válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("verification_requests")
    .insert({ ...parsed.data, document_path: documentPath });
  if (error) return { error: friendlyError(error), values };

  refresh();
  return { ok: true, message: "Recibimos tu solicitud. Moderación la revisará y te avisaremos." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.email) return SESSION_EXPIRED;

  const parsed = newPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  // Volver a ingresar con la contraseña actual confirma la identidad y renueva la sesión
  // (Supabase exige un inicio de sesión reciente para cambiar la contraseña).
  const supabase = await createClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: String(formData.get("current_password") ?? ""),
  });
  if (reauthError) return { error: "Tu contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error) };
  return { ok: true, message: "Contraseña actualizada." };
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notificaciones");
  refresh();
}

// Elimina la cuenta y todos sus datos. Requiere SUPABASE_SECRET_KEY en el servidor.
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  if (
    String(formData.get("confirm") ?? "")
      .trim()
      .toUpperCase() !== "ELIMINAR"
  ) {
    return { error: "Escribe ELIMINAR para confirmar." };
  }
  if (!user.email) return SESSION_EXPIRED;

  // Acción irreversible: pedimos la contraseña aunque la sesión esté abierta.
  const verifier = createVerifierClient();
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: String(formData.get("password") ?? ""),
  });
  if (passwordError) return { error: "La contraseña no es correcta." };
  await verifier.auth.signOut({ scope: "local" });

  const admin = createAdminClient();
  if (!admin) {
    return { error: "La eliminación automática no está configurada. Escríbenos y la haremos manualmente." };
  }

  // Borra los archivos de la persona en cada bucket (carpetas que comienzan con su id).
  for (const bucket of ["avatars", "pet-photos", "followup-photos", "verification-docs"] as const) {
    const paths: string[] = [];
    const { data: entries } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    for (const entry of entries ?? []) {
      if (entry.id) {
        paths.push(`${user.id}/${entry.name}`);
      } else {
        const { data: nested } = await admin.storage
          .from(bucket)
          .list(`${user.id}/${entry.name}`, { limit: 1000 });
        for (const file of nested ?? []) paths.push(`${user.id}/${entry.name}/${file.name}`);
      }
    }
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "No pudimos eliminar la cuenta. Intenta nuevamente o escríbenos." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?cuenta=eliminada");
}
