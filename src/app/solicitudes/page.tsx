import { ChevronRight, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { DogPhoto } from "@/components/dogs/dog-photo";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { requireProfile } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { firstParam, isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Solicitudes de adopción" };

const ACTIVE = ["pending", "reviewing", "approved"] as const;

export default async function ApplicationsPage({ searchParams }: PageProps<"/solicitudes">) {
  const profile = await requireProfile("/solicitudes");
  const params = await searchParams;
  const view = firstParam(params.vista) === "recibidas" ? "recibidas" : "enviadas";
  const dogFilter = firstParam(params.perrito);
  const supabase = await createClient();

  const [sentRes, receivedRes, receivedActive] = await Promise.all([
    view === "enviadas"
      ? supabase
          .from("applications")
          .select(
            "id, status, created_at, updated_at, dog:dogs!applications_dog_id_fkey(id, name, cover_path), other:profiles!applications_publisher_id_fkey(id, display_name, avatar_path)",
          )
          .eq("applicant_id", profile.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: null }),
    view === "recibidas"
      ? (() => {
          let q = supabase
            .from("applications")
            .select(
              "id, status, created_at, updated_at, dog:dogs!applications_dog_id_fkey(id, name, cover_path), other:profiles!applications_applicant_id_fkey(id, display_name, avatar_path)",
            )
            .eq("publisher_id", profile.id)
            .order("created_at", { ascending: false });
          if (isUuid(dogFilter)) q = q.eq("dog_id", dogFilter);
          return q;
        })()
      : Promise.resolve({ data: null }),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("publisher_id", profile.id)
      .in("status", [...ACTIVE]),
  ]);

  const rows = (view === "enviadas" ? sentRes.data : receivedRes.data) ?? [];
  const filteredDogName = view === "recibidas" && isUuid(dogFilter) ? rows[0]?.dog?.name : null;

  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <PageHeader
        title="Solicitudes de adopción"
        description={
          view === "enviadas"
            ? "Sigue el estado de tus postulaciones."
            : "Revisa con calma a cada postulante. Conversa por el chat antes de decidir."
        }
      />
      <LinkTabs
        active={view}
        tabs={[
          { key: "enviadas", href: "/solicitudes", label: "Enviadas" },
          { key: "recibidas", href: "/solicitudes?vista=recibidas", label: "Recibidas", count: receivedActive.count ?? 0 },
        ]}
      />
      {filteredDogName && (
        <p className="mb-4 text-sm text-stone-600">
          Mostrando solicitudes para <strong>{filteredDogName}</strong> ·{" "}
          <Link href="/solicitudes?vista=recibidas" className="font-bold text-brand-700 hover:underline">
            ver todas
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title={view === "enviadas" ? "Aún no has postulado" : "Aún no recibes solicitudes"}
          description={
            view === "enviadas"
              ? "Cuando encuentres a tu perrito ideal, postula desde su publicación."
              : "Cuando alguien postule a uno de tus perritos, aparecerá aquí."
          }
          action={
            view === "enviadas" ? (
              <ButtonLink href="/perritos">Buscar perritos</ButtonLink>
            ) : (
              <ButtonLink href="/publicar" variant="secondary">
                Publicar un perrito
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white">
          {rows.map((app) => (
            <li key={app.id}>
              <Link href={`/solicitudes/${app.id}`} className="flex items-center gap-4 p-4 hover:bg-stone-50">
                <DogPhoto path={app.dog?.cover_path} alt={app.dog?.name ?? "Perrito"} className="h-16 w-16 shrink-0 rounded-2xl" sizes="64px" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-stone-900">{app.dog?.name ?? "Publicación no disponible"}</p>
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                  {app.other && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                      <Avatar name={app.other.display_name} path={app.other.avatar_path} size="xs" />
                      {view === "enviadas" ? "Publicado por " : "Postulante: "}
                      <span className="font-semibold">{app.other.display_name}</span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-stone-400">Actualizada {formatRelative(app.updated_at)}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
