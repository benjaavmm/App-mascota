/* eslint-disable @next/next/no-img-element -- avatares pequeños servidos desde Supabase Storage */
import { avatarUrl } from "@/lib/storage";
import { cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-3xl",
} as const;

export function Avatar({
  name,
  path,
  size = "sm",
  className,
}: {
  name: string;
  path?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const url = avatarUrl(path);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-extrabold text-brand-800 ring-2 ring-white",
        SIZES[size],
        className,
      )}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials(name) || "?"}
    </span>
  );
}
