import { getCommune, getRegion, isValidCommune, isValidRegion, placeLabel } from "@/lib/chile";
import { KIND_SLUGS, SIZE_SHORT, SPECIES_SLUGS, listingTitle } from "@/lib/constants";
import { Constants, type Enums } from "@/types/database";

// Criterios de una alerta de búsqueda (misma forma que la tabla pet_alerts).
export type AlertCriteria = {
  kind: Enums<"listing_kind">;
  species: Enums<"species"> | null;
  region_code: string | null;
  commune_code: string | null;
  size: Enums<"pet_size"> | null;
};

export const MAX_ALERTS = 10;

const SIZES = Constants.public.Enums.pet_size as readonly string[];

function slugOf<T extends string>(map: Record<string, T>, value: T) {
  return Object.keys(map).find((key) => map[key] === value);
}

// Lee los criterios con los mismos nombres que los filtros de /mascotas (tipo, especie, region, comuna, tamano).
export function parseAlertCriteria(values: Record<string, string | undefined>): AlertCriteria {
  const { tipo, especie, tamano } = values;
  const comuna = isValidCommune(values.comuna) ? values.comuna : null;
  const region = comuna
    ? (getCommune(comuna)?.regionCode ?? null)
    : isValidRegion(values.region)
      ? values.region
      : null;
  return {
    kind: tipo && Object.hasOwn(KIND_SLUGS, tipo) ? KIND_SLUGS[tipo] : "adoption",
    species: especie && Object.hasOwn(SPECIES_SLUGS, especie) ? SPECIES_SLUGS[especie] : null,
    region_code: region,
    commune_code: comuna,
    size: tamano && SIZES.includes(tamano) ? (tamano as Enums<"pet_size">) : null,
  };
}

export function alertSearchParams(criteria: AlertCriteria) {
  const params = new URLSearchParams({ tipo: slugOf(KIND_SLUGS, criteria.kind) ?? "adopcion" });
  const especie = criteria.species && slugOf(SPECIES_SLUGS, criteria.species);
  if (especie) params.set("especie", especie);
  if (criteria.region_code) params.set("region", criteria.region_code);
  if (criteria.commune_code) params.set("comuna", criteria.commune_code);
  if (criteria.size) params.set("tamano", criteria.size);
  return params;
}

export function alertSearchHref(criteria: AlertCriteria) {
  return `/mascotas?${alertSearchParams(criteria).toString()}`;
}

// "Gatos en adopción · Ñuñoa, Metropolitana · Tamaño pequeño"
export function alertSummary(criteria: AlertCriteria) {
  const parts = [listingTitle(criteria.kind, criteria.species)];
  if (criteria.commune_code) parts.push(placeLabel(criteria.commune_code));
  else if (criteria.region_code) parts.push(getRegion(criteria.region_code)?.name ?? "Chile");
  else parts.push("Todo Chile");
  if (criteria.size) parts.push(`Tamaño ${SIZE_SHORT[criteria.size].toLowerCase()}`);
  return parts.join(" · ");
}
