import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { APP_NAME } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Adoptar",
    links: [
      { href: "/perritos", label: "Perritos en adopción" },
      { href: "/perritos?tipo=perdidos", label: "Perdidos" },
      { href: "/perritos?tipo=encontrados", label: "Encontrados" },
      { href: "/adoptados", label: "Finales felices" },
    ],
  },
  {
    title: "Aprende",
    links: [
      { href: "/adopcion-responsable", label: "Adopción responsable" },
      { href: "/seguridad", label: "Centro de seguridad" },
      { href: "/seguridad#denunciar", label: "Denunciar maltrato" },
    ],
  },
  {
    title: "Huellitas",
    links: [
      { href: "/publicar", label: "Publicar un perrito" },
      { href: "/terminos", label: "Términos y normas" },
      { href: "/privacidad", label: "Privacidad" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-stone-200 bg-white pb-24 md:pb-0">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Conectamos perritos rescatados con familias responsables en todo Chile. Adoptar es gratis: nunca pagues
            por una adopción.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="mb-3 text-sm font-extrabold text-stone-900">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-600 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-stone-500 sm:px-6">
          © {new Date().getFullYear()} {APP_NAME}. Ante maltrato animal llama a Carabineros (133) o a la PDI (134).
        </p>
      </div>
    </footer>
  );
}
