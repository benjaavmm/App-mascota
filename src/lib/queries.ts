// Columnas reutilizadas en las consultas (nunca usamos "*" para no traer datos de más).

export const DOG_CARD_COLUMNS =
  "id, kind, status, name, sex, size, birth_date_estimate, commune_code, cover_path, is_urgent, sterilized, vaccinated, event_date, created_at, hidden";

export const DOG_DETAIL_COLUMNS =
  "id, owner_id, kind, status, name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy, good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized, microchipped, special_needs, health_notes, requirements, commune_code, region_code, location_hint, event_date, is_urgent, cover_path, hidden, hidden_reason, adopted_at, created_at, updated_at";

export const PUBLIC_PROFILE_COLUMNS =
  "id, display_name, avatar_path, bio, account_type, commune_code, website_url, instagram, verification_status, account_status, created_at";

export type DogCardData = {
  id: string;
  kind: "adoption" | "lost" | "found";
  status: "available" | "in_process" | "adopted" | "reunited" | "paused" | "archived";
  name: string;
  sex: "male" | "female" | "unknown";
  size: "small" | "medium" | "large" | "giant";
  birth_date_estimate: string | null;
  commune_code: string;
  cover_path: string | null;
  is_urgent: boolean;
  sterilized: boolean;
  vaccinated: boolean;
  event_date: string | null;
  created_at: string;
  hidden: boolean;
};

export type ProfileStats = {
  active_listings: number;
  adoptions_given: number;
  adoptions_received: number;
  followups_on_time: number;
};

export function toProfileStats(data: unknown): ProfileStats {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    active_listings: Number(d.active_listings) || 0,
    adoptions_given: Number(d.adoptions_given) || 0,
    adoptions_received: Number(d.adoptions_received) || 0,
    followups_on_time: Number(d.followups_on_time) || 0,
  };
}
