"use client";

import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { MAX_PHOTOS } from "@/lib/constants";
import { dogPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { uploadDogPhotos } from "@/lib/upload";

type Photo = { id: string; storage_path: string; position: number };

// Administra las fotos de una publicación existente (subir, borrar, elegir portada).
export function PhotoManager({ userId, dogId, photos }: { userId: string; dogId: string; photos: Photo[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function add(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, MAX_PHOTOS - photos.length);
    setError(null);
    setBusy(`Subiendo 0/${files.length}…`);
    const nextPosition = photos.reduce((max, p) => Math.max(max, p.position), -1) + 1;
    const failed = await uploadDogPhotos(userId, dogId, files, nextPosition, (done) =>
      setBusy(`Subiendo ${done}/${files.length}…`),
    );
    if (failed.length) setError(`No pudimos subir ${failed.length} foto(s). Revisa que sean imágenes válidas.`);
    setBusy(null);
    router.refresh();
  }

  async function remove(photo: Photo) {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    setError(null);
    setBusy("Eliminando…");
    const { error: rowError } = await supabase.from("dog_photos").delete().eq("id", photo.id);
    if (rowError) {
      setError("No pudimos eliminar la foto.");
    } else {
      await supabase.storage.from("dog-photos").remove([photo.storage_path]);
    }
    setBusy(null);
    router.refresh();
  }

  async function makeCover(photo: Photo) {
    setError(null);
    setBusy("Actualizando portada…");
    const ordered = [photo, ...photos.filter((p) => p.id !== photo.id)];
    for (const [index, p] of ordered.entries()) {
      if (p.position !== index) {
        await supabase.from("dog_photos").update({ position: index }).eq("id", p.id);
      }
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
            <Image src={dogPhotoUrl(photo.storage_path)!} alt={`Foto ${index + 1}`} fill sizes="200px" className="object-cover" />
            {index === 0 && (
              <span className="absolute top-2 left-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
                Portada
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
              {index > 0 && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => makeCover(photo)}
                  className="rounded-full bg-white/90 p-1.5 text-stone-700 hover:bg-white"
                  aria-label={`Usar foto ${index + 1} como portada`}
                >
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => remove(photo)}
                className="rounded-full bg-white/90 p-1.5 text-rose-600 hover:bg-white"
                aria-label={`Eliminar foto ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-stone-300 bg-white text-stone-500 transition hover:border-brand-400 hover:text-brand-600"
          >
            {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
            <span className="px-2 text-center text-xs font-bold">{busy ?? "Agregar fotos"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          add(event.target.files);
          event.target.value = "";
        }}
      />
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      <p className="mt-2 text-xs text-stone-500">
        Hasta {MAX_PHOTOS} fotos. Les quitamos la ubicación GPS antes de subirlas.
      </p>
    </div>
  );
}
