import { AtSign, Ban, Globe, MapPin, PawPrint } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { blockUser } from "@/actions/safety";
import { DogGrid } from "@/components/dogs/dog-card";
import { VerifiedBadge } from "@/components/dogs/dog-badges";
import { ReportButton } from "@/components/safety/report-button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Card, Container, EmptyState } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { getCurrentUser } from "@/lib/auth";
import { placeLabel } from "@/lib/chile";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { DOG_CARD_COLUMNS, PUBLIC_PROFILE_COLUMNS, toProfileStats } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

const getProfile = cache(async (id: string) => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq("id", id).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/usuarios/[id]">): Promise<Metadata> {
  const profile = await getProfile((await params).id);
  return { title: profile ? profile.display_name : "Perfil no encontrado" };
}

export default async function PublicProfilePage({ params }: PageProps<"/usuarios/[id]">) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isMe = viewer?.id === profile.id;
  const supabase = await createClient();

  const [{ data: stats }, { data: dogs }] = await Promise.all([
    supabase.rpc("get_profile_stats", { p_user_id: profile.id }),
    supabase
      .from("dogs")
      .select(DOG_CARD_COLUMNS)
      .eq("owner_id", profile.id)
      .eq("hidden", false)
      .in("status", ["available", "in_process", "adopted", "reunited"])
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  const s = toProfileStats(stats);
  const active = (dogs ?? []).filter((d) => d.status === "available" || d.status === "in_process");
  const happy = (dogs ?? []).filter((d) => d.status === "adopted" || d.status === "reunited");

  return (
    <Container className="py-8 sm:py-10">
      {profile.account_status !== "active" && (
        <Alert variant="warning" className="mb-6">
          Esta cuenta está suspendida temporalmente.
        </Alert>
      )}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar name={profile.display_name} path={profile.avatar_path} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{profile.display_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-stone-600">
              <span>{ACCOUNT_TYPE_LABELS[profile.account_type]}</span>
              {profile.verification_status === "verified" && <VerifiedBadge />}
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {placeLabel(profile.commune_code)}
              </span>
            </div>
            {profile.bio && (
              <p className="mt-4 max-w-2xl leading-relaxed whitespace-pre-line text-stone-700">
                {profile.bio}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {profile.website_url.replace(/^https:\/\//, "")}
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
                >
                  <AtSign className="h-4 w-4" />
                  Instagram: {profile.instagram}
                </a>
              )}
            </div>
          </div>
          <dl className="grid shrink-0 grid-cols-3 gap-3 text-center sm:w-80">
            <div className="rounded-2xl bg-stone-50 p-3">
              <dd className="text-2xl font-extrabold">{s.active_listings}</dd>
              <dt className="text-xs text-stone-500">Buscando hogar</dt>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <dd className="text-2xl font-extrabold">{s.adoptions_given}</dd>
              <dt className="text-xs text-stone-500">Adopciones logradas</dt>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <dd className="text-sm font-extrabold">
                {formatDate(profile.created_at).replace(/^\d+ de /, "")}
              </dd>
              <dt className="text-xs text-stone-500">Miembro desde</dt>
            </div>
          </dl>
        </div>
        {viewer && !isMe && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
            <ReportButton targetType="user" targetId={profile.id} signedIn />
            <ConfirmAction
              action={blockUser}
              fields={{ user_id: profile.id }}
              label={
                <>
                  <Ban className="h-4 w-4" />
                  Bloquear
                </>
              }
              variant="ghost"
              size="sm"
              confirmVariant="danger"
              confirmLabel="Bloquear"
              title={`¿Bloquear a ${profile.display_name}?`}
              description="No podrán escribirse ni postular a sus publicaciones. Puedes desbloquear desde tu perfil."
            />
          </div>
        )}
      </Card>

      <section className="mt-10">
        <h2 className="mb-5 text-2xl font-extrabold">Buscando hogar</h2>
        {active.length ? (
          <DogGrid dogs={active} />
        ) : (
          <EmptyState icon={<PawPrint className="h-10 w-10" />} title="No tiene publicaciones activas" />
        )}
      </section>

      {happy.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-extrabold">Finales felices</h2>
          <DogGrid dogs={happy} showStatus />
        </section>
      )}
    </Container>
  );
}
