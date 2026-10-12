import { ClipboardList, Eye, Pencil, PawPrint, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HiddenBadge, KindBadge, StatusBadge, UrgentBadge } from "@/components/dogs/dog-badges";
import { DogPhoto } from "@/components/dogs/dog-photo";
import { StatusActions } from "@/components/dogs/status-actions";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container, EmptyState, PageHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { placeLabel } from "@/lib/chile";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis publicaciones" };

export default async function MyListingsPage() {
  const profile = await requireProfile("/mis-publicaciones");
  const supabase = await createClient();

  const [{ data: dogs }, { data: apps }] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, kind, status, name, cover_path, commune_code, is_urgent, hidden, hidden_reason, created_at")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("dog_id, status")
      .eq("publisher_id", profile.id)
      .in("status", ["pending", "reviewing", "approved"]),
  ]);

  const counts = new Map<string, { active: number; approved: boolean }>();
  for (const app of apps ?? []) {
    const current = counts.get(app.dog_id) ?? { active: 0, approved: false };
    current.active += 1;
    if (app.status === "approved") current.approved = true;
    counts.set(app.dog_id, current);
  }

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        title="Mis publicaciones"
        description="Administra tus perritos publicados, revisa solicitudes y actualiza su estado."
        action={
          <ButtonLink href="/publicar">
            <Plus className="h-4 w-4" />
            Nueva publicación
          </ButtonLink>
        }
      />

      {!dogs?.length ? (
        <EmptyState
          icon={<PawPrint className="h-12 w-12" />}
          title="Aún no tienes publicaciones"
          description="¿Rescataste a un perrito o buscas a uno perdido? Publícalo y la comunidad te ayudará."
          action={<ButtonLink href="/publicar">Publicar ahora</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {dogs.map((dog) => {
            const c = counts.get(dog.id);
            return (
              <Card key={dog.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                <Link href={`/perritos/${dog.id}`} className="shrink-0">
                  <DogPhoto path={dog.cover_path} alt={dog.name} className="aspect-[4/3] w-full rounded-2xl sm:w-44" sizes="176px" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <KindBadge kind={dog.kind} />
                    <StatusBadge status={dog.status} kind={dog.kind} />
                    {dog.is_urgent && <UrgentBadge />}
                    {dog.hidden && <HiddenBadge />}
                  </div>
                  <h2 className="mt-1.5 text-xl font-extrabold">{dog.name}</h2>
                  <p className="text-sm text-stone-500">
                    {placeLabel(dog.commune_code)} · Publicado el {formatDate(dog.created_at)}
                  </p>
                  {dog.hidden && dog.hidden_reason && (
                    <Alert variant="danger" className="mt-3">
                      {dog.hidden_reason}
                    </Alert>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink href={`/perritos/${dog.id}`} variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                      Ver
                    </ButtonLink>
                    <ButtonLink href={`/mis-publicaciones/${dog.id}`} variant="secondary" size="sm">
                      <Pencil className="h-4 w-4" />
                      Editar
                    </ButtonLink>
                    {dog.kind === "adoption" && (
                      <ButtonLink href={`/solicitudes?vista=recibidas&perrito=${dog.id}`} variant={c?.active ? "soft" : "ghost"} size="sm">
                        <ClipboardList className="h-4 w-4" />
                        Solicitudes {c?.active ? `(${c.active})` : ""}
                      </ButtonLink>
                    )}
                  </div>
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <StatusActions dogId={dog.id} kind={dog.kind} status={dog.status} name={dog.name} hasApproved={c?.approved} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
