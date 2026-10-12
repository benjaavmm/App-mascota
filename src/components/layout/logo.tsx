import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className} fill="currentColor">
      <ellipse cx="32" cy="42" rx="14" ry="12" />
      <ellipse cx="14" cy="28" rx="6.5" ry="8.5" transform="rotate(-18 14 28)" />
      <ellipse cx="50" cy="28" rx="6.5" ry="8.5" transform="rotate(18 50 28)" />
      <ellipse cx="24" cy="14" rx="6" ry="8.5" transform="rotate(-6 24 14)" />
      <ellipse cx="40" cy="14" rx="6" ry="8.5" transform="rotate(6 40 14)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-extrabold text-stone-900", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <PawIcon className="h-5 w-5" />
      </span>
      <span className="text-xl tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
