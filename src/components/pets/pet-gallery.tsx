"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { PetPhoto } from "@/components/pets/pet-photo";
import { petPhotoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function PetGallery({
  name,
  photos,
}: {
  name: string;
  photos: { id: string; storage_path: string }[];
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return <PetPhoto path={null} alt={name} className="aspect-[4/3] rounded-[var(--radius-card)]" />;
  }

  const current = photos[Math.min(index, photos.length - 1)];
  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-brand-50">
        <Image
          key={current.id}
          src={petPhotoUrl(current.storage_path)!}
          alt={`Foto ${index + 1} de ${photos.length} de ${name}`}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-stone-900/70 px-2.5 py-1 text-xs font-bold text-white">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition",
                i === index ? "ring-brand-500" : "opacity-70 ring-transparent hover:opacity-100",
              )}
            >
              <Image
                src={petPhotoUrl(photo.storage_path)!}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
