import type { Enums } from "@/types/database";

export const APP_NAME = "Huellitas";
export const APP_TAGLINE = "Adopción responsable de mascotas rescatadas en Chile";
export const APP_DESCRIPTION =
  "Encuentra, adopta y ayuda a perros, gatos y otros animales rescatados en todo Chile. Publicaciones verificadas, mensajería segura y seguimiento post-adopción.";

export const MAX_PHOTOS = 8;
export const PAGE_SIZE = 12;

export const SPECIES_LABELS: Record<Enums<"species">, string> = {
  dog: "Perro",
  cat: "Gato",
  rabbit: "Conejo",
  rodent: "Roedor",
  bird: "Ave",
  horse: "Caballo",
  other: "Otro",
};

export const SPECIES_PLURAL: Record<Enums<"species">, string> = {
  dog: "Perros",
  cat: "Gatos",
  rabbit: "Conejos",
  rodent: "Roedores",
  bird: "Aves",
  horse: "Caballos",
  other: "Otros",
};

// Ayudas por especie para el formulario.
export const SPECIES_HINTS: Record<Enums<"species">, string> = {
  dog: "",
  cat: "",
  rabbit: "",
  rodent: "Cuyes, hámsters, ratitas, chinchillas…",
  bird: "Solo aves domésticas (canarios, periquitos, gallinas…). La fauna silvestre está prohibida.",
  horse: "Caballos, ponis o burros rescatados.",
  other: "Otros animales domésticos o de granja. No se permite fauna silvestre ni exótica.",
};

// Slugs en español para la URL (?especie=gatos).
export const SPECIES_SLUGS: Record<string, Enums<"species">> = {
  perros: "dog",
  gatos: "cat",
  conejos: "rabbit",
  roedores: "rodent",
  aves: "bird",
  caballos: "horse",
  otros: "other",
};

export const KIND_LABELS: Record<Enums<"listing_kind">, string> = {
  adoption: "En adopción",
  lost: "Perdido",
  found: "Encontrado",
};

export const KIND_SLUGS: Record<string, Enums<"listing_kind">> = {
  adopcion: "adoption",
  perdidos: "lost",
  encontrados: "found",
};

export const STATUS_LABELS: Record<Enums<"pet_status">, string> = {
  available: "Disponible",
  in_process: "En proceso de adopción",
  adopted: "Adoptado",
  reunited: "De vuelta en casa",
  paused: "Pausada",
  archived: "Archivada",
};

export const LOST_FOUND_STATUS_LABELS: Partial<Record<Enums<"pet_status">, string>> = {
  available: "Buscando",
};

export const SEX_LABELS: Record<Enums<"pet_sex">, string> = {
  male: "Macho",
  female: "Hembra",
  unknown: "Sin confirmar",
};

export const SIZE_LABELS: Record<Enums<"pet_size">, string> = {
  small: "Pequeño (hasta 10 kg)",
  medium: "Mediano (10–25 kg)",
  large: "Grande (25–40 kg)",
  giant: "Gigante (más de 40 kg)",
};

export const SIZE_SHORT: Record<Enums<"pet_size">, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  giant: "Gigante",
};

export const ENERGY_LABELS: Record<Enums<"energy_level">, string> = {
  low: "Tranquilo",
  medium: "Energía media",
  high: "Muy activo",
};

export const AGE_GROUPS = {
  cachorro: { label: "Cría o cachorro (menos de 1 año)", minYears: 0, maxYears: 1 },
  joven: { label: "Joven (1 a 3 años)", minYears: 1, maxYears: 3 },
  adulto: { label: "Adulto (3 a 8 años)", minYears: 3, maxYears: 8 },
  senior: { label: "Senior (más de 8 años)", minYears: 8, maxYears: 30 },
} as const;
export type AgeGroup = keyof typeof AGE_GROUPS;

export const ACCOUNT_TYPE_LABELS: Record<Enums<"account_type">, string> = {
  person: "Persona",
  rescuer: "Rescatista independiente",
  shelter: "Fundación o refugio",
};

export const APPLICATION_STATUS_LABELS: Record<Enums<"application_status">, string> = {
  pending: "Pendiente",
  reviewing: "En revisión",
  approved: "Aprobada",
  rejected: "No aceptada",
  withdrawn: "Retirada",
  cancelled: "Cerrada",
  completed: "Adopción concretada",
};

export const HOUSING_TYPE_LABELS: Record<Enums<"housing_type">, string> = {
  house: "Casa",
  apartment: "Departamento",
  rural: "Parcela o campo",
  other: "Otro",
};

export const HOUSING_TENURE_LABELS: Record<Enums<"housing_tenure">, string> = {
  owned: "Propia",
  rented: "Arrendada",
  family: "De mi familia",
  other: "Otra situación",
};

export const REPORT_REASON_LABELS: Record<Enums<"report_reason">, string> = {
  animal_sale: "Venta de animales o cobro por adopción",
  animal_abuse: "Maltrato o sospecha de maltrato",
  scam: "Estafa o petición de dinero",
  false_info: "Información falsa",
  inappropriate: "Contenido inapropiado",
  harassment: "Acoso o amenazas",
  spam: "Spam o publicidad",
  impersonation: "Suplantación de identidad",
  other: "Otro motivo",
};

export const REPORT_STATUS_LABELS: Record<Enums<"report_status">, string> = {
  open: "Abierto",
  reviewing: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

export const VERIFICATION_LABELS: Record<Enums<"verification_status">, string> = {
  unverified: "Sin verificar",
  pending: "Verificación en revisión",
  verified: "Verificado",
  rejected: "Verificación rechazada",
};

export const ACCOUNT_STATUS_LABELS: Record<Enums<"account_status">, string> = {
  active: "Activa",
  suspended: "Suspendida",
  banned: "Bloqueada",
};

export const ROLE_LABELS: Record<Enums<"user_role">, string> = {
  user: "Persona usuaria",
  moderator: "Moderación",
  admin: "Administración",
};

export const WELLBEING_LABELS: Record<number, string> = {
  1: "Me preocupa",
  2: "Con dificultades",
  3: "Adaptándose",
  4: "Bien",
  5: "¡Feliz!",
};

// Los rangos de peso solo tienen sentido para perros.
export function sizeLabel(species: Enums<"species">, size: Enums<"pet_size">) {
  return species === "dog" ? SIZE_LABELS[size] : SIZE_SHORT[size];
}

// Raza sugerida al publicar, según la especie.
export function defaultBreed(species: Enums<"species">) {
  return species === "dog" || species === "cat" || species === "rabbit" ? "Mestizo" : "Sin especificar";
}
