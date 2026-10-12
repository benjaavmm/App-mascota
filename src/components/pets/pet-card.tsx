import { MapPin } from "lucide-react";
import Link from "next/link";

import { KindBadge, StatusBadge, UrgentBadge } from "@/components/pets/pet-badges";
import { PetPhoto } from "@/components/pets/pet-photo";
import { SEX_LABELS, SIZE_SHORT } from "@/lib/constants";
import { getCommune } from "@/lib/chile";
import { formatAge, formatShortDate } from "@/lib/format";
import type { PetCardData } from "@/lib/queries";

export function PetCard({ pet, showStatus = false }: { pet: PetCardData; showStatus?: boolean }) {
  const commune = getCommune(pet.commune_code)?.name ?? "Chile";
  const isLostFound = pet.kind !== "adoption";

  return (
    <Link
      href={`/mascotas/${pet.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative">
        <PetPhoto
          path={pet.cover_path}
          alt={`Foto de ${pet.name}`}
          className="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <KindBadge kind={pet.kind} />
          {pet.is_urgent && pet.status === "available" && <UrgentBadge />}
          {(showStatus || pet.status !== "available") && <StatusBadge status={pet.status} kind={pet.kind} />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-extrabold text-stone-900">{pet.name}</h3>
        <p className="mt-0.5 text-sm text-stone-600">
          {[SEX_LABELS[pet.sex], isLostFound ? null : formatAge(pet.birth_date_estimate), SIZE_SHORT[pet.size]]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-sm text-stone-500">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{commune}</span>
          </span>
          {isLostFound && pet.event_date && (
            <span className="shrink-0 text-xs font-semibold">
              {pet.kind === "lost" ? "Perdido el " : "Encontrado el "}
              {formatShortDate(pet.event_date)}
            </span>
          )}
          {!isLostFound && (pet.sterilized || pet.vaccinated) && (
            <span className="shrink-0 text-xs font-semibold text-teal-700">
              {pet.sterilized ? "Esterilizado" : "Vacunado"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PetGrid({ pets, showStatus }: { pets: PetCardData[]; showStatus?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {pets.map((pet) => (
        <PetCard key={pet.id} pet={pet} showStatus={showStatus} />
      ))}
    </div>
  );
}
