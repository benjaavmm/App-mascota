import { MapPin } from "lucide-react";
import Link from "next/link";

import { KindBadge, StatusBadge, UrgentBadge } from "@/components/dogs/dog-badges";
import { DogPhoto } from "@/components/dogs/dog-photo";
import { SEX_LABELS, SIZE_SHORT } from "@/lib/constants";
import { getCommune } from "@/lib/chile";
import { formatAge, formatShortDate } from "@/lib/format";
import type { DogCardData } from "@/lib/queries";

export function DogCard({ dog, showStatus = false }: { dog: DogCardData; showStatus?: boolean }) {
  const commune = getCommune(dog.commune_code)?.name ?? "Chile";
  const isLostFound = dog.kind !== "adoption";

  return (
    <Link
      href={`/perritos/${dog.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative">
        <DogPhoto
          path={dog.cover_path}
          alt={`Foto de ${dog.name}`}
          className="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <KindBadge kind={dog.kind} />
          {dog.is_urgent && dog.status === "available" && <UrgentBadge />}
          {(showStatus || dog.status !== "available") && <StatusBadge status={dog.status} kind={dog.kind} />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-extrabold text-stone-900">{dog.name}</h3>
        <p className="mt-0.5 text-sm text-stone-600">
          {[SEX_LABELS[dog.sex], isLostFound ? null : formatAge(dog.birth_date_estimate), SIZE_SHORT[dog.size]]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-sm text-stone-500">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{commune}</span>
          </span>
          {isLostFound && dog.event_date && (
            <span className="shrink-0 text-xs font-semibold">
              {dog.kind === "lost" ? "Perdido el " : "Encontrado el "}
              {formatShortDate(dog.event_date)}
            </span>
          )}
          {!isLostFound && (dog.sterilized || dog.vaccinated) && (
            <span className="shrink-0 text-xs font-semibold text-teal-700">
              {dog.sterilized ? "Esterilizado" : "Vacunado"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DogGrid({ dogs, showStatus }: { dogs: DogCardData[]; showStatus?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {dogs.map((dog) => (
        <DogCard key={dog.id} dog={dog} showStatus={showStatus} />
      ))}
    </div>
  );
}
