import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const CARDS = [
  { key: "urgent_reports", label: "Reportes urgentes", href: "/admin/reportes", alert: true },
  { key: "open_reports", label: "Reportes abiertos", href: "/admin/reportes", alert: true },
  {
    key: "pending_verifications",
    label: "Verificaciones pendientes",
    href: "/admin/verificaciones",
    alert: true,
  },
  { key: "hidden_pets", label: "Publicaciones ocultas", href: "/admin/publicaciones?ocultas=1" },
  { key: "overdue_followups", label: "Seguimientos atrasados (+14 días)" },
  {
    key: "suspended_users",
    label: "Cuentas suspendidas o bloqueadas",
    href: "/admin/usuarios?estado=suspendidas",
  },
  { key: "users", label: "Personas registradas" },
  { key: "pets_available", label: "Mascotas disponibles" },
  { key: "adoptions_completed", label: "Adopciones concretadas" },
  { key: "applications_last_7d", label: "Solicitudes (últimos 7 días)" },
] as const;

export default async function AdminHome() {
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_overview");
  const stats = (data ?? {}) as Record<string, number>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CARDS.map((card) => {
        const value = stats[card.key] ?? 0;
        const highlight = "alert" in card && card.alert && value > 0;
        const content = (
          <Card className={cn("p-5", highlight && "border-rose-200 bg-rose-50")}>
            <p className={cn("text-3xl font-extrabold", highlight ? "text-rose-700" : "text-stone-900")}>
              {value.toLocaleString("es-CL")}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-600">{card.label}</p>
          </Card>
        );
        return "href" in card && card.href ? (
          <Link key={card.key} href={card.href} className="transition hover:-translate-y-0.5">
            {content}
          </Link>
        ) : (
          <div key={card.key}>{content}</div>
        );
      })}
    </div>
  );
}
