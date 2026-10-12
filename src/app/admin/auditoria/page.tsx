import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  hide_pet: "Ocultó una publicación",
  unhide_pet: "Restauró una publicación",
  auto_hide_pet: "Ocultamiento automático por reportes",
  report_reviewing: "Tomó un reporte",
  report_resolved: "Resolvió un reporte",
  report_dismissed: "Descartó un reporte",
  report_open: "Reabrió un reporte",
  account_active: "Reactivó una cuenta",
  account_suspended: "Suspendió una cuenta",
  account_banned: "Bloqueó una cuenta",
  set_role: "Cambió un rol",
  verification_approved: "Aprobó una verificación",
  verification_rejected: "Rechazó una verificación",
};

export default async function AdminAuditPage() {
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("audit_log")
    .select(
      "id, action, target_type, target_id, details, created_at, actor:profiles!audit_log_actor_id_fkey(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (!entries?.length) {
    return <EmptyState icon={<ScrollText className="h-10 w-10" />} title="Aún no hay acciones registradas" />;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-stone-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs tracking-wide text-stone-500 uppercase">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Quién</th>
            <th className="px-4 py-3">Acción</th>
            <th className="px-4 py-3">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {entries.map((e) => {
            const details = (e.details ?? {}) as Record<string, unknown>;
            const detailText = [
              details.pet_name,
              details.display_name,
              details.reason,
              details.note,
              details.role,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <tr key={e.id}>
                <td className="px-4 py-3 whitespace-nowrap text-stone-500">
                  {formatDate(e.created_at)} {formatTime(e.created_at)}
                </td>
                <td className="px-4 py-3 font-semibold">{e.actor?.display_name ?? "Sistema"}</td>
                <td className="px-4 py-3">{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="px-4 py-3 text-stone-600">
                  {detailText || `${e.target_type} ${e.target_id?.slice(0, 8) ?? ""}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
