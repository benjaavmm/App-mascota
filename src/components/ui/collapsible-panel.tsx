"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Panel plegable en móvil y siempre visible en pantallas grandes.
export function CollapsiblePanel({
  title,
  icon,
  badge,
  children,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-stone-200 bg-white shadow-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left font-extrabold lg:hidden"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
          {badge}
        </span>
        <ChevronDown className={cn("h-5 w-5 text-stone-500 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn(open ? "block border-t border-stone-100" : "hidden", "lg:block lg:border-0")}>{children}</div>
    </div>
  );
}
