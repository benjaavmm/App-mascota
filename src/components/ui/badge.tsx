import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-stone-100 text-stone-700",
  brand: "bg-brand-100 text-brand-800",
  teal: "bg-teal-100 text-teal-800",
  sky: "bg-sky-100 text-sky-800",
  rose: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-800",
  violet: "bg-violet-100 text-violet-800",
  dark: "bg-stone-900/80 text-white backdrop-blur",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
