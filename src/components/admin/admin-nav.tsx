"use client";

import { BadgeCheck, Flag, LayoutDashboard, PawPrint, ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/reportes", label: "Reportes", icon: Flag },
  { href: "/admin/verificaciones", label: "Verificaciones", icon: BadgeCheck },
  { href: "/admin/publicaciones", label: "Publicaciones", icon: PawPrint },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Moderación">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold whitespace-nowrap",
              active ? "bg-teal-700 text-white" : "text-stone-700 hover:bg-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
