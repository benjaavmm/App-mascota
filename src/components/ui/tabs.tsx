import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function LinkTabs({
  tabs,
  active,
}: {
  tabs: { key: string; href: string; label: ReactNode; count?: number }[];
  active: string;
}) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1" aria-label="Secciones">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
              isActive ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-brand-100 text-brand-800" : "bg-stone-200 text-stone-700",
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
