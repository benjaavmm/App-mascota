"use client";

import { prepareImage, randomFileName } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";

// Sube fotos de una publicación: procesa cada imagen (sin EXIF/GPS), la guarda en
// Storage y registra la fila en dog_photos. Devuelve los nombres que fallaron.
export async function uploadDogPhotos(
  userId: string,
  dogId: string,
  files: File[],
  startPosition = 0,
  onProgress?: (done: number) => void,
) {
  const supabase = createClient();
  const failed: string[] = [];

  for (const [index, file] of files.entries()) {
    try {
      const blob = await prepareImage(file);
      const path = `${userId}/${dogId}/${randomFileName()}`;
      const { error: uploadError } = await supabase.storage
        .from("dog-photos")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await supabase
        .from("dog_photos")
        .insert({ dog_id: dogId, storage_path: path, position: startPosition + index });
      if (rowError) {
        await supabase.storage.from("dog-photos").remove([path]);
        throw rowError;
      }
    } catch {
      failed.push(file.name);
    }
    onProgress?.(index + 1);
  }
  return failed;
}

export async function uploadPrivateImage(
  bucket: "followup-photos" | "verification-docs",
  folder: string,
  file: File,
) {
  const supabase = createClient();
  const isPdf = file.type === "application/pdf";
  if (isPdf && file.size > 10 * 1024 * 1024) throw new Error("El PDF supera los 10 MB.");
  const body = isPdf ? file : await prepareImage(file);
  const path = `${folder}/${randomFileName(isPdf ? "pdf" : "jpg")}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: isPdf ? "application/pdf" : "image/jpeg", upsert: false });
  if (error) throw new Error("No pudimos subir el archivo. Intenta nuevamente.");
  return path;
}
