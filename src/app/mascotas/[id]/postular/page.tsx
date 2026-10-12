import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { submitApplication } from "@/actions/applications";
import { ApplicationForm } from "@/components/applications/application-form";
import { PetPhoto } from "@/components/pets/pet-photo";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";
import { isAccountActive, requireProfile } from "@/lib/auth";
import { placeLabel } from "@/lib/chile";
import { SEX_LABELS, SIZE_SHORT } from "@/lib/constants";
import { formatAge } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Postular a una adopción" };

export default async function ApplyPage({ params }: PageProps<"/mascotas/[id]/postular">) {
  const { id } = await params;
  const profile = await requireProfile(`/mascotas/${id}/postular`);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id, owner_id, kind, status, hidden, name, sex, size, birth_date_estimate, commune_code, cover_path, requirements")
    .eq("id", id)
    .maybeSingle();
  if (!pet) notFound();

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("pet_id", pet.id)
    .eq("applicant_id", profile.id)
    .in("status", ["pending", "reviewing", "approved"])
    .maybeSingle();
  if (existing) redirect(`/solicitudes/${existing.id}`);

  const blocker =
    pet.owner_id === profile.id
      ? "Esta es tu propia publicación."
      : pet.kind !== "adoption"
        ? "Esta publicación no es de adopción."
        : pet.status !== "available" || pet.hidden
          ? `${pet.name} no está recibiendo solicitudes en este momento.`
          : !isAccountActive(profile)
            ? "Tu cuenta está suspendida y no puede postular por ahora."
            : null;

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <Link href={`/mascotas/${pet.id}`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Volver a {pet.name}
      </Link>
      <Card className="mb-6 flex items-center gap-4 p-4">
        <PetPhoto path={pet.cover_path} alt={pet.name} className="h-20 w-24 shrink-0 rounded-2xl" sizes="96px" />
        <div>
          <p className="text-sm font-bold text-brand-700">Solicitud de adopción</p>
          <h1 className="text-2xl font-extrabold">{pet.name}</h1>
          <p className="text-sm text-stone-600">
            {SEX_LABELS[pet.sex]} · {formatAge(pet.birth_date_estimate)} · {SIZE_SHORT[pet.size]} · {placeLabel(pet.commune_code)}
          </p>
        </div>
      </Card>

      {blocker ? (
        <div className="space-y-4">
          <Alert variant="warning">{blocker}</Alert>
          <ButtonLink href="/mascotas" variant="secondary">
            Ver otros perritos
          </ButtonLink>
        </div>
      ) : (
        <>
          <Alert variant="info" title="Antes de postular" className="mb-6">
            Adoptar es un compromiso de 10 a 15 años. Responde con sinceridad: no hay respuestas “correctas”, solo
            buscamos el mejor hogar para {pet.name}.
            {pet.requirements && (
              <span className="mt-2 block">
                <strong>Requisitos de quien publica:</strong> {pet.requirements}
              </span>
            )}
          </Alert>
          <ApplicationForm petName={pet.name} action={submitApplication.bind(null, pet.id)} />
        </>
      )}
    </Container>
  );
}
