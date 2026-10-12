"use client";

import {
  ClipboardList,
  Heart,
  HeartHandshake,
  LogOut,
  PawPrint,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/actions/auth";
import { Avatar } from "@/components/ui/avatar";

export const ACCOUNT_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/perfil", label: "Mi perfil", icon: User },
  { href: "/mis-publicaciones", label: "Mis publicaciones", icon: PawPrint },
  { href: "/solicitudes", label: "Solicitudes de adopción", icon: ClipboardList },
  { href: "/seguimientos", label: "Seguimientos", icon: HeartHandshake },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
];

export function UserMenu({
  name,
  avatarPath,
  isModerator,
}: {
  name: string;
  avatarPath: string | null;
  isModerator: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Cierra el menú al navegar.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de mi cuenta"
        className="flex items-center gap-2 rounded-full p-0.5 hover:bg-stone-100"
      >
        <Avatar name={name} path={avatarPath} size="sm" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white py-2 shadow-xl"
        >
          <p className="truncate px-4 pt-1 pb-2 text-sm font-extrabold text-stone-900">{name}</p>
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Icon className="h-4 w-4 text-stone-500" />
              {label}
            </Link>
          ))}
          {isModerator && (
            <Link
              href="/admin"
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            >
              <Shield className="h-4 w-4" />
              Panel de moderación
            </Link>
          )}
          <form action={signOut} className="mt-1 border-t border-stone-100 pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <LogOut className="h-4 w-4 text-stone-500" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
