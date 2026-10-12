import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Pick<
  Tables<"profiles">,
  | "id"
  | "display_name"
  | "avatar_path"
  | "bio"
  | "account_type"
  | "commune_code"
  | "website_url"
  | "instagram"
  | "terms_accepted_at"
  | "adult_confirmed_at"
  | "role"
  | "verification_status"
  | "account_status"
  | "suspended_until"
  | "created_at"
>;

export const PROFILE_COLUMNS =
  "id, display_name, avatar_path, bio, account_type, commune_code, website_url, instagram, terms_accepted_at, adult_confirmed_at, role, verification_status, account_status, suspended_until, created_at";

export type CurrentUser = { id: string; email: string | null };

// Usuario de la sesión actual (validado criptográficamente). Se memoriza por petición.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  return data;
});

export function isOnboarded(profile: Profile | null) {
  return Boolean(profile?.commune_code && profile.terms_accepted_at && profile.adult_confirmed_at);
}

export function isAccountActive(profile: Profile | null) {
  if (!profile) return false;
  if (profile.account_status === "active") return true;
  return (
    profile.account_status === "suspended" &&
    !!profile.suspended_until &&
    new Date(profile.suspended_until) <= new Date()
  );
}

export function isModerator(profile: Profile | null) {
  return (
    !!profile &&
    profile.account_status === "active" &&
    (profile.role === "moderator" || profile.role === "admin")
  );
}

export function isAdmin(profile: Profile | null) {
  return !!profile && profile.account_status === "active" && profile.role === "admin";
}

function loginUrl(next?: string) {
  return next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar";
}

// Exige sesión iniciada. `next` es la ruta a la que volver después de ingresar.
export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(next));
  return user;
}

// Exige sesión y perfil completo (comuna, términos y mayoría de edad).
export async function requireProfile(next?: string) {
  await requireUser(next);
  const profile = await getCurrentProfile();
  if (!profile) redirect(loginUrl(next));
  if (!isOnboarded(profile)) {
    redirect(next ? `/bienvenida?next=${encodeURIComponent(next)}` : "/bienvenida");
  }
  return profile;
}

export async function requireModerator() {
  await requireUser("/admin");
  const profile = await getCurrentProfile();
  if (!isModerator(profile)) notFound();
  return profile!;
}

// Solo permite redirecciones internas (evita redirecciones abiertas a otros sitios).
export function safeNext(next: unknown, fallback = "/") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
