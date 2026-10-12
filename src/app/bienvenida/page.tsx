import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/profile/onboarding-form";
import { getCurrentProfile, isOnboarded, requireUser, safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function WelcomePage({ searchParams }: PageProps<"/bienvenida">) {
  const user = await requireUser("/bienvenida");
  const next = safeNext(firstParam((await searchParams).next), "/");
  const profile = await getCurrentProfile();
  if (profile && isOnboarded(profile) && firstParam((await searchParams).editar) !== "1") {
    redirect(next);
  }

  const supabase = await createClient();
  const { data: privateData } = await supabase.from("profile_private").select("phone").eq("user_id", user.id).maybeSingle();

  return (
    <AuthShell
      title="¡Te damos la bienvenida! 🐾"
      description="Antes de empezar, cuéntanos un poco de ti. Esto nos ayuda a mantener una comunidad segura."
    >
      <OnboardingForm
        next={next}
        defaults={{
          display_name: profile?.display_name ?? "",
          account_type: profile?.account_type ?? "person",
          commune_code: profile?.commune_code ?? null,
          phone: privateData?.phone ?? null,
        }}
      />
    </AuthShell>
  );
}
