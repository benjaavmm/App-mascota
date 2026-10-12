import type { Metadata } from "next";

import { PetForm } from "@/components/pets/pet-form";
import { Alert } from "@/components/ui/alert";
import { Container, PageHeader } from "@/components/ui/card";
import { isAccountActive, requireProfile } from "@/lib/auth";
import { SPECIES_SLUGS } from "@/lib/constants";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Publicar un perrito" };

export default async function PublishPage({ searchParams }: PageProps<"/publicar">) {
  const profile = await requireProfile("/publicar");
  const params = await searchParams;
  const tipo = firstParam(params.tipo);
  const defaultKind = tipo === "lost" || tipo === "found" ? tipo : "adoption";
  const especie = firstParam(params.especie);
  const defaultSpecies = especie && especie in SPECIES_SLUGS ? SPECIES_SLUGS[especie] : "dog";

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        title="Publicar un perrito"
        description="Completa la información con honestidad. Mientras más detalles, más fácil será encontrarle el hogar correcto."
      />
      <Alert variant="info" title="Normas de la comunidad" className="mb-6">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Está prohibido vender animales o cobrar por adoptar. Solo puedes pedir compromisos de cuidado.
          </li>
          <li>Usa fotos reales y actuales del perrito.</li>
          <li>No publiques tu teléfono ni tu dirección: las personas te escribirán por el chat seguro.</li>
        </ul>
      </Alert>
      {isAccountActive(profile) ? (
        <PetForm
          mode="create"
          userId={profile.id}
          defaultKind={defaultKind}
          defaultSpecies={defaultSpecies}
          defaultCommune={profile.commune_code}
        />
      ) : (
        <Alert variant="danger" title="Tu cuenta está suspendida">
          Mientras dure la suspensión no puedes publicar. Revisa tus notificaciones para más detalles.
        </Alert>
      )}
    </Container>
  );
}
