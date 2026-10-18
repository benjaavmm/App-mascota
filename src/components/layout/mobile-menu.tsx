"use client";

import { LogOut, Menu, Shield, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { signOut } from "@/actions/auth";
import { InstallAppButton } from "@/components/layout/install-app";
import { Logo } from "@/components/layout/logo";
import { ACCOUNT_LINKS } from "@/components/layout/user-menu";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileMenu({
  links,
  signedIn,
  isModerator,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
  isModerator: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full p-2 text-stone-700 hover:bg-stone-100"
        aria-label="Abrir menú"
        aria-expanded={open}
      >
        <Menu className="h-6 w-6" />
      </button>
      {/* Se monta en <body>: el desenfoque del encabezado (backdrop-filter) atraparía un "fixed" dentro de él. */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col bg-cream"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-stone-700 hover:bg-stone-100"
                aria-label="Cerrar menú"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <ul className="space-y-1">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "block rounded-2xl px-4 py-3 text-lg font-bold",
                        pathname === link.href
                          ? "bg-brand-100 text-brand-800"
                          : "text-stone-800 hover:bg-white",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {signedIn ? (
                <>
                  <p className="mt-8 mb-2 px-4 text-xs font-bold tracking-wider text-stone-500 uppercase">
                    Mi cuenta
                  </p>
                  <ul className="space-y-1">
                    {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-stone-700 hover:bg-white"
                        >
                          <Icon className="h-5 w-5 text-stone-500" />
                          {label}
                        </Link>
                      </li>
                    ))}
                    {isModerator && (
                      <li>
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-teal-800 hover:bg-white"
                        >
                          <Shield className="h-5 w-5" />
                          Panel de moderación
                        </Link>
                      </li>
                    )}
                    <li>
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-stone-700 hover:bg-white"
                        >
                          <LogOut className="h-5 w-5 text-stone-500" />
                          Cerrar sesión
                        </button>
                      </form>
                    </li>
                  </ul>
                </>
              ) : (
                <div className="mt-8 grid gap-3">
                  <Link href="/registro" className={buttonClasses({ size: "lg" })}>
                    Crear cuenta
                  </Link>
                  <Link href="/ingresar" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                    Ingresar
                  </Link>
                </div>
              )}
              <div className="mt-8">
                <InstallAppButton className="w-full" />
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
