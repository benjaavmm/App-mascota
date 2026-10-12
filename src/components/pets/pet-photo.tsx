import Image from "next/image";

import { PawIcon } from "@/components/layout/logo";
import { petPhotoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function PetPhoto({
  path,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const url = petPhotoUrl(path);
  return (
    <div className={cn("relative overflow-hidden bg-brand-50", className)}>
      {url ? (
        <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-300">
          <PawIcon className="h-14 w-14" />
          <span className="text-xs font-bold text-brand-400">Sin foto todavía</span>
        </div>
      )}
    </div>
  );
}
