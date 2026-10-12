import { PawPrint } from "lucide-react";
import Link from "next/link";

import { SpeciesIcon } from "@/components/pets/species-icon";
import { SPECIES_PLURAL, SPECIES_SLUGS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

const chip =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors";

// Fila de filtros rápidos por especie (desplazable en móvil).
export function SpeciesChips({
  active,
  hrefFor,
}: {
  active: Enums<"species"> | null;
  hrefFor: (slug: string | null) => string;
}) {
  return (
    <nav
      aria-label="Filtrar por especie"
      className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      <Link
        href={hrefFor(null)}
        aria-current={active === null ? "page" : undefined}
        className={cn(
          chip,
          active === null
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-stone-300 bg-white text-stone-700 hover:border-brand-400",
        )}
      >
        <PawPrint className="h-4 w-4" aria-hidden />
        Todas
      </Link>
      {Object.entries(SPECIES_SLUGS).map(([slug, species]) => (
        <Link
          key={slug}
          href={hrefFor(slug)}
          aria-current={active === species ? "page" : undefined}
          className={cn(
            chip,
            active === species
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:border-brand-400",
          )}
        >
          <SpeciesIcon species={species} className="h-4 w-4" />
          {SPECIES_PLURAL[species]}
        </Link>
      ))}
    </nav>
  );
}
