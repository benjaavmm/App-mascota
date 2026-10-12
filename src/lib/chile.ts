import { COMMUNES, REGIONS, type Commune } from "@/lib/chile-data";

export { COMMUNES, REGIONS };

const communeByCode = new Map(COMMUNES.map((c) => [c.code, c]));
const regionByCode = new Map(REGIONS.map((r) => [r.code, r]));

export function getCommune(code: string | null | undefined) {
  return code ? communeByCode.get(code) : undefined;
}

export function getRegion(code: string | null | undefined) {
  return code ? regionByCode.get(code) : undefined;
}

export function communesOfRegion(regionCode: string): Commune[] {
  return COMMUNES.filter((c) => c.regionCode === regionCode);
}

export function isValidCommune(code: unknown): code is string {
  return typeof code === "string" && communeByCode.has(code);
}

export function isValidRegion(code: unknown): code is string {
  return typeof code === "string" && regionByCode.has(code);
}

// "Ñuñoa, Metropolitana"
export function placeLabel(communeCode: string | null | undefined) {
  const commune = getCommune(communeCode);
  if (!commune) return "Chile";
  const region = getRegion(commune.regionCode);
  return region ? `${commune.name}, ${region.shortName}` : commune.name;
}
