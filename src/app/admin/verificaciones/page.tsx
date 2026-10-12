import { BadgeCheck, FileText } from "lucide-react";
import Link from "next/link";

import { reviewVerificationAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { LinkTabs } from "@/components/ui/tabs";
import { ACCOUNT_TYPE_LABELS, VERIFICATION_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

export default async function AdminVerificationsPage({ searchParams }: PageProps<"/admin/verificaciones">) {
  const view = firstParam((await searchParams).estado) === "revisadas" ? "revisadas" : "pendientes";
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();

  let query = supabase
    .from("verification_requests")
    .select(
      "id, requested_type, organization_name, description, social_links, document_path, status, review_note, created_at, user:profiles!verification_requests_user_id_fkey(id, display_name, created_at)",
    )
    .order("created_at", { ascending: view === "pendientes" })
    .limit(100);
  query = view === "pendientes" ? query.eq("status", "pending") : query.neq("status", "pending");
  const { data: requests } = await query;

  // Enlaces temporales (10 min) a los documentos privados.
  const docUrls = new Map<string, string>();
  await Promise.all(
    (requests ?? [])
      .filter((r) => r.document_path)
      .map(async (r) => {
        const { data } = await supabase.storage
          .from("verification-docs")
          .createSignedUrl(r.document_path!, 600);
        if (data?.signedUrl) docUrls.set(r.id, data.signedUrl);
      }),
  );

  return (
    <div>
      <LinkTabs
        active={view}
        tabs={[
          { key: "pendientes", href: "/admin/verificaciones", label: "Pendientes" },
          { key: "revisadas", href: "/admin/verificaciones?estado=revisadas", label: "Revisadas" },
        ]}
      />
      {!requests?.length ? (
        <EmptyState icon={<BadgeCheck className="h-10 w-10" />} title="No hay solicitudes en esta vista" />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="teal">{ACCOUNT_TYPE_LABELS[r.requested_type]}</Badge>
                <Badge tone={r.status === "pending" ? "amber" : r.status === "verified" ? "teal" : "rose"}>
                  {VERIFICATION_LABELS[r.status]}
                </Badge>
                <span className="ml-auto text-xs text-stone-400">{formatRelative(r.created_at)}</span>
              </div>
              <p className="mt-2 text-lg font-extrabold">
                {r.user ? (
                  <Link href={`/usuarios/${r.user.id}`} className="hover:underline">
                    {r.user.display_name}
                  </Link>
                ) : (
                  "Cuenta eliminada"
                )}
                {r.organization_name && (
                  <span className="font-semibold text-stone-500"> · {r.organization_name}</span>
                )}
              </p>
              <p className="mt-2 text-sm whitespace-pre-line text-stone-700">{r.description}</p>
              {r.social_links && (
                <p className="mt-2 text-sm break-all whitespace-pre-line text-stone-600">
                  <strong>Enlaces:</strong> {r.social_links}
                </p>
              )}
              {docUrls.get(r.id) && (
                <a
                  href={docUrls.get(r.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline"
                >
                  <FileText className="h-4 w-4" /> Ver documento (enlace temporal)
                </a>
              )}
              {r.review_note && <p className="mt-2 text-sm text-stone-500">Nota: {r.review_note}</p>}
              {r.status === "pending" && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                  <ConfirmAction
                    action={reviewVerificationAction}
                    fields={{ request_id: r.id, approve: "1" }}
                    label="Aprobar"
                    variant="success"
                    size="sm"
                    confirmVariant="success"
                    title={`¿Verificar a ${r.user?.display_name}?`}
                    description="Su perfil mostrará la insignia de cuenta verificada."
                    messageField={{ name: "note", label: "Mensaje (opcional)" }}
                  />
                  <ConfirmAction
                    action={reviewVerificationAction}
                    fields={{ request_id: r.id, approve: "0" }}
                    label="Rechazar"
                    variant="danger-soft"
                    size="sm"
                    confirmVariant="danger"
                    title="Rechazar la solicitud"
                    messageField={{ name: "note", label: "Motivo (lo verá la persona)", required: true }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
