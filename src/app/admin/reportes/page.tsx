import { Flag, Siren } from "lucide-react";
import Link from "next/link";

import { resolveReportAction } from "@/actions/admin";
import { AccountModerationActions, PetModerationAction } from "@/components/admin/moderation-actions";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { LinkTabs } from "@/components/ui/tabs";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, firstParam } from "@/lib/utils";

const URGENT = new Set(["animal_abuse", "animal_sale", "scam"]);
const TARGET_LABELS = { pet: "Publicación", user: "Persona", message: "Mensaje" } as const;

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reportes">) {
  const view = firstParam((await searchParams).estado) ?? "abiertos";
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();

  let query = supabase
    .from("reports")
    .select(
      "id, target_type, reason, details, message_snapshot, status, resolution_note, created_at, pet:pets!reports_pet_id_fkey(id, name, hidden), reporter:profiles!reports_reporter_id_fkey(id, display_name), reported:profiles!reports_reported_user_id_fkey(id, display_name, account_status)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (view === "abiertos") query = query.in("status", ["open", "reviewing"]);
  if (view === "cerrados") query = query.in("status", ["resolved", "dismissed"]);
  const { data: reports } = await query;

  const sorted = [...(reports ?? [])].sort(
    (a, b) =>
      Number(URGENT.has(b.reason) && b.status !== "resolved") -
      Number(URGENT.has(a.reason) && a.status !== "resolved"),
  );

  return (
    <div>
      <LinkTabs
        active={view}
        tabs={[
          { key: "abiertos", href: "/admin/reportes", label: "Abiertos" },
          { key: "cerrados", href: "/admin/reportes?estado=cerrados", label: "Cerrados" },
          { key: "todos", href: "/admin/reportes?estado=todos", label: "Todos" },
        ]}
      />
      {!sorted.length ? (
        <EmptyState
          icon={<Flag className="h-10 w-10" />}
          title="No hay reportes en esta vista"
          description="¡Buen trabajo!"
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((r) => {
            const urgent = URGENT.has(r.reason);
            const open = r.status === "open" || r.status === "reviewing";
            return (
              <Card
                key={r.id}
                role="article"
                aria-label={`Reporte: ${REPORT_REASON_LABELS[r.reason]}`}
                className={cn("p-5", urgent && open && "border-rose-300")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {urgent && (
                    <Badge tone="rose" icon={<Siren className="h-3 w-3" />}>
                      Urgente
                    </Badge>
                  )}
                  <Badge tone="neutral">{TARGET_LABELS[r.target_type as keyof typeof TARGET_LABELS]}</Badge>
                  <Badge tone={open ? "amber" : "teal"}>{REPORT_STATUS_LABELS[r.status]}</Badge>
                  <span className="ml-auto text-xs text-stone-400">{formatRelative(r.created_at)}</span>
                </div>
                <p className="mt-2 text-lg font-extrabold">{REPORT_REASON_LABELS[r.reason]}</p>
                <dl className="mt-2 space-y-1 text-sm">
                  {r.pet && (
                    <div>
                      <dt className="inline text-stone-500">Publicación: </dt>
                      <dd className="inline">
                        <Link
                          href={`/mascotas/${r.pet.id}`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          {r.pet.name}
                        </Link>
                        {r.pet.hidden && (
                          <span className="ml-2 text-xs font-bold text-rose-600">(oculta)</span>
                        )}
                      </dd>
                    </div>
                  )}
                  {r.reported && (
                    <div>
                      <dt className="inline text-stone-500">Persona reportada: </dt>
                      <dd className="inline">
                        <Link
                          href={`/usuarios/${r.reported.id}`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          {r.reported.display_name}
                        </Link>
                        {r.reported.account_status !== "active" && (
                          <span className="ml-2 text-xs font-bold text-rose-600">
                            ({r.reported.account_status === "banned" ? "bloqueada" : "suspendida"})
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-stone-500">Reportado por: </dt>
                    <dd className="inline font-semibold">{r.reporter?.display_name ?? "Cuenta eliminada"}</dd>
                  </div>
                </dl>
                {r.details && (
                  <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm whitespace-pre-line">{r.details}</p>
                )}
                {r.message_snapshot && (
                  <blockquote className="mt-3 rounded-xl border-l-4 border-rose-300 bg-rose-50 p-3 text-sm whitespace-pre-line">
                    <span className="mb-1 block text-xs font-bold text-rose-700">Mensaje reportado:</span>
                    {r.message_snapshot}
                  </blockquote>
                )}
                {r.resolution_note && (
                  <p className="mt-3 text-sm text-stone-600">Nota: {r.resolution_note}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                  {r.status === "open" && (
                    <ConfirmAction
                      action={resolveReportAction}
                      fields={{ report_id: r.id, status: "reviewing" }}
                      label="Tomar caso"
                      size="sm"
                      title="¿Marcar como en revisión?"
                    />
                  )}
                  {open && (
                    <>
                      <ConfirmAction
                        action={resolveReportAction}
                        fields={{ report_id: r.id, status: "resolved" }}
                        label="Resolver"
                        variant="success"
                        size="sm"
                        confirmVariant="success"
                        title="Marcar como resuelto"
                        description="Usa esto cuando ya tomaste medidas (ocultar, suspender, advertir)."
                        messageField={{ name: "note", label: "Nota interna" }}
                      />
                      <ConfirmAction
                        action={resolveReportAction}
                        fields={{ report_id: r.id, status: "dismissed" }}
                        label="Descartar"
                        variant="ghost"
                        size="sm"
                        title="Descartar reporte"
                        description="No se encontró una infracción."
                        messageField={{ name: "note", label: "Nota interna" }}
                      />
                    </>
                  )}
                  {r.pet && (
                    <PetModerationAction petId={r.pet.id} petName={r.pet.name} hidden={r.pet.hidden} />
                  )}
                  {r.reported && (
                    <AccountModerationActions
                      userId={r.reported.id}
                      name={r.reported.display_name}
                      status={r.reported.account_status}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
