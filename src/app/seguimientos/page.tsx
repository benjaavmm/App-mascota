import { ChevronRight, HeartHandshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DogPhoto } from "@/components/dogs/dog-photo";
import { Badge } from "@/components/ui/badge";
import { CardSection, Container, EmptyState, PageHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { FOLLOWUP_STATE_LABELS, followupState, type FollowupState } from "@/lib/followups";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seguimientos" };

const TONE: Record<FollowupState, "teal" | "neutral" | "amber" | "rose"> = {
  submitted: "teal",
  upcoming: "neutral",
  due: "amber",
  overdue: "rose",
};

type Row = {
  id: string;
  label: string;
  due_on: string;
  submitted_at: string | null;
  dog: { id: string; name: string; cover_path: string | null } | null;
};

function FollowupList({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {rows.map((f) => {
        const state = followupState(f);
        return (
          <li key={f.id}>
            <Link href={`/seguimientos/${f.id}`} className="flex items-center gap-3 py-3 hover:bg-stone-50">
              <DogPhoto path={f.dog?.cover_path} alt={f.dog?.name ?? ""} className="h-12 w-12 shrink-0 rounded-xl" sizes="48px" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {f.dog?.name} · {f.label}
                </p>
                <p className="text-sm text-stone-500">
                  {f.submitted_at ? `Enviado el ${formatDate(f.submitted_at)}` : `Fecha: ${formatDate(f.due_on)}`}
                </p>
              </div>
              <Badge tone={TONE[state]}>{FOLLOWUP_STATE_LABELS[state]}</Badge>
              <ChevronRight className="h-5 w-5 text-stone-400" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function FollowupsPage() {
  const profile = await requireProfile("/seguimientos");
  const supabase = await createClient();
  const columns = "id, label, due_on, submitted_at, dog:dogs!followups_dog_id_fkey(id, name, cover_path)";

  const [{ data: asAdopter }, { data: asPublisher }] = await Promise.all([
    supabase.from("followups").select(columns).eq("adopter_id", profile.id).order("due_on"),
    supabase.from("followups").select(columns).eq("publisher_id", profile.id).order("due_on"),
  ]);

  const empty = !asAdopter?.length && !asPublisher?.length;

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        title="Seguimientos post-adopción"
        description="Pequeños reportes para saber que cada perrito adoptado está bien cuidado."
      />
      {empty ? (
        <EmptyState
          icon={<HeartHandshake className="h-12 w-12" />}
          title="No tienes seguimientos"
          description="Cuando se concrete una adopción, aquí verás los recordatorios a la semana, al mes, a los 3 y a los 6 meses."
        />
      ) : (
        <div className="space-y-6">
          {!!asAdopter?.length && (
            <CardSection title="Perritos que adoptaste" description="Envía cada seguimiento cuando llegue su fecha.">
              <FollowupList rows={asAdopter} />
            </CardSection>
          )}
          {!!asPublisher?.length && (
            <CardSection title="Perritos que entregaste" description="Revisa cómo están y responde a cada seguimiento.">
              <FollowupList rows={asPublisher} />
            </CardSection>
          )}
        </div>
      )}
    </Container>
  );
}
