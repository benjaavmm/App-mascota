"use server";

import { redirect } from "next/navigation";

import { safeNext } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { friendlyAuthError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  emailSchema,
  formObject,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formObject(formData);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, { email: values.email ?? "" });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error), values: { email: parsed.data.email } };

  const next = safeNext(values.next, "/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("commune_code, terms_accepted_at, adult_confirmed_at")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.commune_code || !profile.terms_accepted_at || !profile.adult_confirmed_at) {
    redirect(`/bienvenida?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formObject(formData);
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) {
    return validationError(parsed.error, {
      display_name: values.display_name ?? "",
      email: values.email ?? "",
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name },
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=/bienvenida`,
    },
  });

  if (error && error.code !== "user_already_exists") {
    return {
      error: friendlyAuthError(error),
      values: { display_name: parsed.data.display_name, email: parsed.data.email },
    };
  }

  // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
  return {
    ok: true,
    message: `Te enviamos un correo a ${parsed.data.email}. Abre el enlace para confirmar tu cuenta y continuar.`,
    values: { email: parsed.data.email },
  };
}

export async function signOut(formData?: FormData) {
  const supabase = await createClient();
  // Este dispositivo deja de recibir los avisos de la cuenta que cierra sesión.
  const endpoint = formData?.get("push_endpoint");
  if (typeof endpoint === "string" && endpoint.startsWith("https://")) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/nueva-clave`,
  });
  if (error && /rate limit/i.test(error.message)) {
    return { error: friendlyAuthError(error) };
  }
  return {
    ok: true,
    message: "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.",
  };
}

export async function resendConfirmation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${SITE_URL}/auth/confirm?next=/bienvenida` },
  });
  if (error && /rate limit|seconds/i.test(error.message)) {
    return { error: "Espera un momento antes de pedir otro correo." };
  }
  return { ok: true, message: "Si la cuenta existe y no está confirmada, te reenviamos el correo." };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { error: "El enlace expiró. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error) };
  return { ok: true, message: "Tu contraseña se actualizó correctamente." };
}
