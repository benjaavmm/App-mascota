import { SUPABASE_URL } from "@/lib/env";

export type PublicBucket = "avatars" | "pet-photos";

// URL pública de un archivo en un bucket público.
export function publicUrl(bucket: PublicBucket, path: string | null | undefined) {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

export function petPhotoUrl(path: string | null | undefined) {
  return publicUrl("pet-photos", path);
}

export function avatarUrl(path: string | null | undefined) {
  return publicUrl("avatars", path);
}
