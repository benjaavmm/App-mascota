import { Heart } from "lucide-react";
import type { Metadata } from "next";

import { PetGrid } from "@/components/pets/pet-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { PET_CARD_COLUMNS, type PetCardData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUser("/favoritos");
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select(`created_at, pet:pets!favorites_pet_id_fkey(${PET_CARD_COLUMNS})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Las publicaciones que ya no son visibles (pausadas, ocultas) se omiten automáticamente por RLS.
  const pets = (data ?? []).map((f) => f.pet).filter((d): d is PetCardData => Boolean(d));

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="Mis favoritos" description="Las mascotas que guardaste para revisar con calma." />
      {pets.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-12 w-12" />}
          title="Aún no tienes favoritos"
          description="Toca el corazón en la publicación de una mascota para guardarla aquí."
          action={<ButtonLink href="/mascotas">Buscar mascotas</ButtonLink>}
        />
      ) : (
        <PetGrid pets={pets} showStatus />
      )}
    </Container>
  );
}
