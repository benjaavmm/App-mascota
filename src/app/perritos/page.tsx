import { PawPrint, Plus } from "lucide-react";
import type { Metadata } from "next";

import { DogGrid } from "@/components/dogs/dog-card";
import { DogFilters, type DogFilterValues } from "@/components/dogs/dog-filters";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { LinkTabs } from "@/components/ui/tabs";
import { isValidCommune, isValidRegion } from "@/lib/chile";
import { AGE_GROUPS, KIND_SLUGS, PAGE_SIZE, type AgeGroup } from "@/lib/constants";
import { isoDateFromAge } from "@/lib/format";
import { DOG_CARD_COLUMNS } from "@/lib/queries";
import { normalizeText } from "@/lib/safety";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";
import { Constants } from "@/types/database";

export const metadata: Metadata = {
  title: "Buscar perritos",
  description: "Perritos en adopción, perdidos y encontrados en todo Chile.",
};

const SIZES = Constants.public.Enums.dog_size as readonly string[];
const COPY = {
  adopcion: {
    title: "Perritos en adopción",
    description: "Todos buscan un hogar responsable. La adopción en Huellitas es siempre gratuita.",
    empty: "No encontramos perritos con esos filtros",
  },
  perdidos: {
    title: "Perritos perdidos",
    description: "Si viste a alguno, escríbele a su familia por el chat. Cada dato ayuda.",
    empty: "No hay perritos perdidos con esos filtros",
  },
  encontrados: {
    title: "Perritos encontrados",
    description: "Perritos que alguien encontró y resguarda. ¿Reconoces a alguno?",
    empty: "No hay perritos encontrados con esos filtros",
  },
} as const;

export default async function DogsPage({ searchParams }: PageProps<"/perritos">) {
  const params = await searchParams;
  const tipoParam = firstParam(params.tipo);
  const tipo = (tipoParam && tipoParam in KIND_SLUGS ? tipoParam : "adopcion") as keyof typeof COPY;
  const kind = KIND_SLUGS[tipo];

  const region = firstParam(params.region);
  const comuna = firstParam(params.comuna);
  const tamano = firstParam(params.tamano);
  const sexo = firstParam(params.sexo);
  const edad = firstParam(params.edad);
  const q = firstParam(params.q)?.trim().slice(0, 80);
  const orden = firstParam(params.orden) ?? "recientes";
  const page = Math.max(1, Math.min(500, Number(firstParam(params.pagina)) || 1));

  const filters: DogFilterValues = {
    tipo,
    q,
    region: isValidRegion(region) ? region : undefined,
    comuna: isValidCommune(comuna) ? comuna : undefined,
    tamano: tamano && SIZES.includes(tamano) ? tamano : undefined,
    sexo: sexo === "male" || sexo === "female" ? sexo : undefined,
    edad: edad && edad in AGE_GROUPS ? edad : undefined,
    esterilizado: firstParam(params.esterilizado) === "1",
    ninos: firstParam(params.ninos) === "1",
    perros: firstParam(params.perros) === "1",
    gatos: firstParam(params.gatos) === "1",
    urgente: firstParam(params.urgente) === "1",
    orden,
  };

  const supabase = await createClient();
  let query = supabase
    .from("dogs")
    .select(DOG_CARD_COLUMNS, { count: "exact" })
    .eq("kind", kind)
    .eq("status", "available")
    .eq("hidden", false);

  if (filters.q) {
    query = query.textSearch("search_vector", normalizeText(filters.q), { type: "websearch", config: "spanish" });
  }
  if (filters.comuna) query = query.eq("commune_code", filters.comuna);
  else if (filters.region) query = query.eq("region_code", filters.region);
  if (filters.tamano) query = query.eq("size", filters.tamano as (typeof Constants.public.Enums.dog_size)[number]);
  if (filters.sexo) query = query.eq("sex", filters.sexo as "male" | "female");
  if (kind === "adoption") {
    if (filters.edad) {
      const group = AGE_GROUPS[filters.edad as AgeGroup];
      query = query
        .gt("birth_date_estimate", isoDateFromAge(group.maxYears, 0))
        .lte("birth_date_estimate", isoDateFromAge(group.minYears, 0));
    }
    if (filters.esterilizado) query = query.eq("sterilized", true);
    if (filters.ninos) query = query.eq("good_with_kids", true);
    if (filters.perros) query = query.eq("good_with_dogs", true);
    if (filters.gatos) query = query.eq("good_with_cats", true);
    if (filters.urgente) query = query.eq("is_urgent", true);
  }

  if (orden === "urgentes") query = query.order("is_urgent", { ascending: false });
  query = query.order("created_at", { ascending: orden === "antiguos" });

  const from = (page - 1) * PAGE_SIZE;
  const { data: dogs, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const v = firstParam(value);
      if (v && key !== "pagina") next.set(key, v);
    });
    if (!next.has("tipo")) next.set("tipo", tipo);
    if (p > 1) next.set("pagina", String(p));
    return `/perritos?${next.toString()}`;
  };

  const copy = COPY[tipo];

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={
          <ButtonLink href={`/publicar?tipo=${kind}`} variant="soft">
            <Plus className="h-4 w-4" />
            {kind === "adoption" ? "Dar en adopción" : kind === "lost" ? "Publicar perdido" : "Publicar encontrado"}
          </ButtonLink>
        }
      />
      <LinkTabs
        active={tipo}
        tabs={[
          { key: "adopcion", href: "/perritos?tipo=adopcion", label: "En adopción" },
          { key: "perdidos", href: "/perritos?tipo=perdidos", label: "Perdidos" },
          { key: "encontrados", href: "/perritos?tipo=encontrados", label: "Encontrados" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DogFilters key={JSON.stringify(filters)} values={filters} />
        </aside>
        <section aria-live="polite">
          {error ? (
            <Alert variant="danger">No pudimos cargar los resultados. Intenta nuevamente.</Alert>
          ) : dogs && dogs.length > 0 ? (
            <>
              <p className="mb-4 text-sm font-semibold text-stone-500">
                {total === 1 ? "1 resultado" : `${total.toLocaleString("es-CL")} resultados`}
              </p>
              <DogGrid dogs={dogs} />
              <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
            </>
          ) : (
            <EmptyState
              icon={<PawPrint className="h-12 w-12" />}
              title={copy.empty}
              description="Prueba ampliando la búsqueda a toda la región o quitando algunos filtros."
              action={
                <ButtonLink href={`/perritos?tipo=${tipo}`} variant="secondary">
                  Ver todos
                </ButtonLink>
              }
            />
          )}
        </section>
      </div>
    </Container>
  );
}
