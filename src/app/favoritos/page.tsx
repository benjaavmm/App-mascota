import { Heart } from "lucide-react";
import type { Metadata } from "next";

import { DogGrid } from "@/components/dogs/dog-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { DOG_CARD_COLUMNS, type DogCardData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUser("/favoritos");
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select(`created_at, dog:dogs!favorites_dog_id_fkey(${DOG_CARD_COLUMNS})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Las publicaciones que ya no son visibles (pausadas, ocultas) se omiten automáticamente por RLS.
  const dogs = (data ?? []).map((f) => f.dog).filter((d): d is DogCardData => Boolean(d));

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="Mis favoritos" description="Los perritos que guardaste para revisar con calma." />
      {dogs.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-12 w-12" />}
          title="Aún no tienes favoritos"
          description="Toca el corazón en la publicación de un perrito para guardarlo aquí."
          action={<ButtonLink href="/perritos">Buscar perritos</ButtonLink>}
        />
      ) : (
        <DogGrid dogs={dogs} showStatus />
      )}
    </Container>
  );
}
