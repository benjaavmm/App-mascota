"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { toggleFavorite } from "@/actions/pets";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  petId,
  initial,
  signedIn,
}: {
  petId: string;
  initial: boolean;
  signedIn: boolean;
}) {
  const [favorite, setFavorite] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Link
        href={`/ingresar?next=/mascotas/${petId}`}
        className={buttonClasses({ variant: "secondary", size: "icon" })}
        aria-label="Ingresa para guardar en favoritos"
      >
        <Heart className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-pressed={favorite}
        aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        title={error ?? undefined}
        onClick={() => {
          setError(null);
          setFavorite((v) => !v);
          startTransition(async () => {
            const result = await toggleFavorite(petId);
            if (result.error) {
              setFavorite((v) => !v);
              setError(result.error);
            } else if (typeof result.favorite === "boolean") {
              setFavorite(result.favorite);
            }
          });
        }}
        className={buttonClasses({
          variant: "secondary",
          size: "icon",
          className: cn(favorite && "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"),
        })}
      >
        <Heart className={cn("h-5 w-5", favorite && "fill-current")} />
      </button>
    </>
  );
}
