import { ClipboardList, Eye, Pencil, PawPrint, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HiddenBadge, KindBadge, StatusBadge, UrgentBadge } from "@/components/pets/pet-badges";
import { PetPhoto } from "@/components/pets/pet-photo";
import { StatusActions } from "@/components/pets/status-actions";
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

  const [{ data: pets }, { data: apps }] = await Promise.all([
    supabase
      .from("pets")
      .select(
        "id, kind, status, name, cover_path, commune_code, is_urgent, hidden, hidden_reason, created_at",
      )
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("pet_id, status")
      .eq("publisher_id", profile.id)
      .in("status", ["pending", "reviewing", "approved"]),
  ]);

  const counts = new Map<string, { active: number; approved: boolean }>();
  for (const app of apps ?? []) {
    const current = counts.get(app.pet_id) ?? { active: 0, approved: false };
    current.active += 1;
    if (app.status === "approved") current.approved = true;
    counts.set(app.pet_id, current);
  }

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        title="Mis publicaciones"
        description="Administra tus mascotas publicadas, revisa solicitudes y actualiza su estado."
        action={
          <ButtonLink href="/publicar">
            <Plus className="h-4 w-4" />
            Nueva publicación
          </ButtonLink>
        }
      />

      {!pets?.length ? (
        <EmptyState
          icon={<PawPrint className="h-12 w-12" />}
          title="Aún no tienes publicaciones"
          description="¿Rescataste a un animal o buscas a tu mascota perdida? Publícalo y la comunidad te ayudará."
          action={<ButtonLink href="/publicar">Publicar ahora</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {pets.map((pet) => {
            const c = counts.get(pet.id);
            return (
              <Card key={pet.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                <Link href={`/mascotas/${pet.id}`} className="shrink-0">
                  <PetPhoto
                    path={pet.cover_path}
                    alt={pet.name}
                    className="aspect-[4/3] w-full rounded-2xl sm:w-44"
                    sizes="176px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <KindBadge kind={pet.kind} />
                    <StatusBadge status={pet.status} kind={pet.kind} />
                    {pet.is_urgent && <UrgentBadge />}
                    {pet.hidden && <HiddenBadge />}
                  </div>
                  <h2 className="mt-1.5 text-xl font-extrabold">{pet.name}</h2>
                  <p className="text-sm text-stone-500">
                    {placeLabel(pet.commune_code)} · Publicado el {formatDate(pet.created_at)}
                  </p>
                  {pet.hidden && pet.hidden_reason && (
                    <Alert variant="danger" className="mt-3">
                      {pet.hidden_reason}
                    </Alert>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink href={`/mascotas/${pet.id}`} variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                      Ver
                    </ButtonLink>
                    <ButtonLink href={`/mis-publicaciones/${pet.id}`} variant="secondary" size="sm">
                      <Pencil className="h-4 w-4" />
                      Editar
                    </ButtonLink>
                    {pet.kind === "adoption" && (
                      <ButtonLink
                        href={`/solicitudes?vista=recibidas&perrito=${pet.id}`}
                        variant={c?.active ? "soft" : "ghost"}
                        size="sm"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Solicitudes {c?.active ? `(${c.active})` : ""}
                      </ButtonLink>
                    )}
                  </div>
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <StatusActions
                      petId={pet.id}
                      kind={pet.kind}
                      status={pet.status}
                      name={pet.name}
                      hasApproved={c?.approved}
                    />
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
