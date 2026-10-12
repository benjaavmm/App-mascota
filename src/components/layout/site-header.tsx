import { Plus } from "lucide-react";
import Link from "next/link";

import { HeaderIcons } from "@/components/layout/header-icons";
import { Logo } from "@/components/layout/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { ButtonLink } from "@/components/ui/button";
import type { Profile } from "@/lib/auth";

export const MAIN_LINKS = [
  { href: "/mascotas", label: "Adoptar" },
  { href: "/mascotas?tipo=perdidos", label: "Perdidos y encontrados" },
  { href: "/adoptados", label: "Finales felices" },
  { href: "/seguridad", label: "Seguridad" },
];

export function SiteHeader({ profile, isModerator }: { profile: Profile | null; isModerator: boolean }) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-stone-200/80 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Principal">
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-sm font-bold text-stone-700 hover:bg-white hover:text-stone-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {profile ? (
            <>
              <div className="hidden md:block">
                <ButtonLink href="/publicar" size="sm">
                  <Plus className="h-4 w-4" />
                  Publicar
                </ButtonLink>
              </div>
              <HeaderIcons />
              <div className="hidden md:block">
                <UserMenu name={profile.display_name} avatarPath={profile.avatar_path} isModerator={isModerator} />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <ButtonLink href="/ingresar" variant="ghost" size="sm">
                Ingresar
              </ButtonLink>
              <ButtonLink href="/registro" size="sm">
                Crear cuenta
              </ButtonLink>
            </div>
          )}
          <MobileMenu links={MAIN_LINKS} signedIn={Boolean(profile)} isModerator={isModerator} />
        </div>
      </div>
    </header>
  );
}
