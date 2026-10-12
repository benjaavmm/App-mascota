"use client";

import { Home, MessageCircle, PlusCircle, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CountBadge, useUnread } from "@/components/layout/unread-provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  { href: "/mascotas", label: "Buscar", icon: Search, match: (p: string) => p.startsWith("/mascotas") },
  { href: "/publicar", label: "Publicar", icon: PlusCircle, match: (p: string) => p.startsWith("/publicar") },
  { href: "/mensajes", label: "Mensajes", icon: MessageCircle, match: (p: string) => p.startsWith("/mensajes") },
  {
    href: "/perfil",
    label: "Cuenta",
    icon: User,
    match: (p: string) => ["/perfil", "/mis-publicaciones", "/solicitudes", "/seguimientos", "/favoritos", "/alertas"].some((x) => p.startsWith(x)),
  },
];

// Barra de navegación inferior tipo app, solo en pantallas pequeñas.
export function BottomNav() {
  const pathname = usePathname();
  const { messages } = useUnread();

  return (
    <nav
      aria-label="Navegación principal"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold",
                  active ? "text-brand-700" : "text-stone-500",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-6 w-6", href === "/publicar" && "text-brand-600")} />
                  {href === "/mensajes" && <CountBadge count={messages} />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
