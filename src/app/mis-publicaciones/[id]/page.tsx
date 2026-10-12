import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateDog } from "@/actions/dogs";
import { HiddenBadge, KindBadge, StatusBadge } from "@/components/dogs/dog-badges";
import { DogForm } from "@/components/dogs/dog-form";
import { PhotoManager } from "@/components/dogs/photo-manager";
import { StatusActions } from "@/components/dogs/status-actions";
import { Alert } from "@/components/ui/alert";
import { CardSection, Container, PageHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar publicación" };

export default async function EditListingPage({ params }: PageProps<"/mis-publicaciones/[id]">) {
  const { id } = await params;
  const profile = await requireProfile(`/mis-publicaciones/${id}`);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: dog } = await supabase
    .from("dogs")
    .select(
      "id, owner_id, kind, status, hidden, hidden_reason, name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy, good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized, microchipped, special_needs, health_notes, requirements, commune_code, location_hint, event_date, is_urgent, dog_photos(id, storage_path, position, created_at)",
    )
    .eq("id", id)
    .eq("owner_id", profile.id)
    .order("position", { referencedTable: "dog_photos" })
    .order("created_at", { referencedTable: "dog_photos" })
    .maybeSingle();

  if (!dog) notFound();

  const { count: approved } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("dog_id", dog.id)
    .eq("status", "approved");

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <Link href="/mis-publicaciones" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Mis publicaciones
      </Link>
      <PageHeader
        title={`Editar a ${dog.name}`}
        eyebrow={
          <span className="flex gap-1.5">
            <KindBadge kind={dog.kind} />
            <StatusBadge status={dog.status} kind={dog.kind} />
            {dog.hidden && <HiddenBadge />}
          </span>
        }
      />
      {dog.hidden && (
        <Alert variant="danger" title="Publicación oculta por moderación" className="mb-6">
          {dog.hidden_reason ?? "Está en revisión."} Puedes corregirla; moderación revisará nuevamente.
        </Alert>
      )}
      <div className="space-y-6">
        <CardSection title="Estado" description="Mantén la publicación al día para no generar falsas esperanzas.">
          <StatusActions dogId={dog.id} kind={dog.kind} status={dog.status} name={dog.name} hasApproved={(approved ?? 0) > 0} size="md" />
        </CardSection>
        <CardSection title="Fotos" description="La primera foto es la portada.">
          <PhotoManager userId={profile.id} dogId={dog.id} photos={dog.dog_photos ?? []} />
        </CardSection>
        <DogForm mode="edit" dog={dog} action={updateDog.bind(null, dog.id)} />
      </div>
    </Container>
  );
}
