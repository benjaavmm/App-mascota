import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold";

  return (
    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "text-stone-700 hover:bg-white")} aria-label="Página anterior">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <span className={cn(item, "text-stone-300")} aria-hidden>
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}
      {visible.map((p, index) => (
        <span key={p} className="flex items-center gap-1.5">
          {index > 0 && visible[index - 1] !== p - 1 && <span className="px-1 text-stone-400">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-brand-600 text-white" : "text-stone-700 hover:bg-white")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "text-stone-700 hover:bg-white")} aria-label="Página siguiente">
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : (
        <span className={cn(item, "text-stone-300")} aria-hidden>
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}
