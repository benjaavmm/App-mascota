import { PartyPopper } from "lucide-react";
import type { Metadata } from "next";

import { PetGrid } from "@/components/pets/pet-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE } from "@/lib/constants";
import { PET_CARD_COLUMNS } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Finales felices",
  description: "Mascotas que encontraron un hogar o volvieron a casa gracias a la comunidad.",
};

export default async function HappyEndingsPage({ searchParams }: PageProps<"/adoptados">) {
  const page = Math.max(1, Number(firstParam((await searchParams).pagina)) || 1);
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const { data: pets, count } = await supabase
    .from("pets")
    .select(PET_CARD_COLUMNS, { count: "exact" })
    .in("status", ["adopted", "reunited"])
    .eq("hidden", false)
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        title="Finales felices 🎉"
        description="Cada una de estas mascotas encontró un hogar o volvió con su familia gracias a la comunidad."
      />
      {pets?.length ? (
        <>
          <PetGrid pets={pets} showStatus />
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => (p > 1 ? `/adoptados?pagina=${p}` : "/adoptados")}
          />
        </>
      ) : (
        <EmptyState
          icon={<PartyPopper className="h-12 w-12" />}
          title="Los primeros finales felices están por llegar"
          description="Cuando se concrete una adopción en AyudaPatitas, la celebraremos aquí."
          action={<ButtonLink href="/mascotas">Ver mascotas en adopción</ButtonLink>}
        />
      )}
    </Container>
  );
}
