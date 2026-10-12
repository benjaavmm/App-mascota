"use client";

/* eslint-disable @next/next/no-img-element -- vistas previas locales (blob:) */
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { MAX_PHOTOS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Selector de fotos previo a publicar. La primera foto es la portada.
export function PhotoPicker({
  files,
  onChange,
  max = MAX_PHOTOS,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    onChange([...files, ...images].slice(0, max));
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
            <img src={previews[index]} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
            {index === 0 && (
              <span className="absolute top-2 left-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
                Portada
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([file, ...files.filter((_, i) => i !== index)])}
                  className="rounded-full bg-white/90 p-1.5 text-stone-700 hover:bg-white"
                  aria-label={`Usar foto ${index + 1} como portada`}
                >
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="rounded-full bg-white/90 p-1.5 text-rose-600 hover:bg-white"
                aria-label={`Quitar foto ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-stone-300 bg-white text-stone-500 transition hover:border-brand-400 hover:text-brand-600",
            )}
          >
            <ImagePlus className="h-7 w-7" />
            <span className="text-xs font-bold">Agregar fotos</span>
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
      <p className="mt-2 text-xs text-stone-500">
        Hasta {max} fotos. Las reducimos y les quitamos la ubicación GPS antes de subirlas.
      </p>
    </div>
  );
}
