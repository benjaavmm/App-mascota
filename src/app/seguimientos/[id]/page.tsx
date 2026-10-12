/* eslint-disable @next/next/no-img-element -- foto privada servida con URL firmada temporal */
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DogPhoto } from "@/components/dogs/dog-photo";
import { FollowupCommentForm, FollowupForm } from "@/components/followups/followup-form";
import { ReportButton } from "@/components/safety/report-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardSection, Container } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { WELLBEING_LABELS } from "@/lib/constants";
import { FOLLOWUP_STATE_LABELS, followupState } from "@/lib/followups";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Seguimiento" };

export default async function FollowupPage({ params }: PageProps<"/seguimientos/[id]">) {
  const { id } = await params;
  const profile = await requireProfile(`/seguimientos/${id}`);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: f } = await supabase
    .from("followups")
    .select(
      "*, dog:dogs!followups_dog_id_fkey(id, name, cover_path), application:applications!followups_application_id_fkey(id, conversation_id), adopter:profiles!followups_adopter_id_fkey(id, display_name), publisher:profiles!followups_publisher_id_fkey(id, display_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!f) notFound();

  const isAdopter = f.adopter_id === profile.id;
  const isPublisher = f.publisher_id === profile.id;
  const state = followupState(f);
  const dogName = f.dog?.name ?? "el perrito";

  let photoUrl: string | null = null;
  if (f.photo_path) {
    const { data } = await supabase.storage.from("followup-photos").createSignedUrl(f.photo_path, 60 * 30);
    photoUrl = data?.signedUrl ?? null;
  }

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <Link href="/seguimientos" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" />
        Seguimientos
      </Link>

      <Card className="mb-6 flex items-center gap-4 p-4">
        <DogPhoto path={f.dog?.cover_path} alt={dogName} className="h-20 w-24 shrink-0 rounded-2xl" sizes="96px" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-700">Seguimiento · {f.label}</p>
          <h1 className="text-2xl font-extrabold">{dogName}</h1>
          <p className="text-sm text-stone-600">
            Adoptado por {f.adopter?.display_name} · Entregado por {f.publisher?.display_name}
          </p>
        </div>
        <Badge tone={state === "submitted" ? "teal" : state === "overdue" ? "rose" : state === "due" ? "amber" : "neutral"}>
          {FOLLOWUP_STATE_LABELS[state]}
        </Badge>
      </Card>

      {f.submitted_at ? (
        <div className="space-y-6">
          <CardSection title={`Enviado el ${formatDate(f.submitted_at)}`}>
            {f.wellbeing && (
              <p className="mb-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">
                Estado: {WELLBEING_LABELS[f.wellbeing]}
              </p>
            )}
            <p className="leading-relaxed whitespace-pre-line text-stone-700">{f.notes}</p>
            {photoUrl && <img src={photoUrl} alt={`Foto de ${dogName}`} className="mt-4 max-h-96 rounded-2xl object-cover" />}
          </CardSection>
          {f.publisher_comment ? (
            <Alert variant="info" title={`Respuesta de ${f.publisher?.display_name}`}>
              {f.publisher_comment}
            </Alert>
          ) : (
            isPublisher && (
              <CardSection title="Responder">
                <FollowupCommentForm followupId={f.id} />
              </CardSection>
            )
          )}
          {isPublisher && f.wellbeing !== null && f.wellbeing <= 2 && (
            <Alert variant="warning" title="¿Te preocupa su bienestar?">
              Conversa con la persona adoptante por el chat. Si sospechas maltrato o abandono, repórtalo y, si hay riesgo
              inmediato, llama al 133.
            </Alert>
          )}
        </div>
      ) : isAdopter ? (
        state === "upcoming" ? (
          <Alert variant="info">Podrás enviar este seguimiento a partir de una semana antes del {formatDate(f.due_on)}.</Alert>
        ) : (
          <CardSection title="Enviar seguimiento" description="Toma menos de 2 minutos y da mucha tranquilidad a quien lo rescató.">
            <FollowupForm followupId={f.id} userId={profile.id} dogName={dogName} />
          </CardSection>
        )
      ) : (
        <Alert variant={state === "overdue" ? "warning" : "info"}>
          {state === "overdue"
            ? `Este seguimiento está atrasado (fecha: ${formatDate(f.due_on)}). Escríbele a la persona adoptante por el chat.`
            : `Este seguimiento corresponde al ${formatDate(f.due_on)}. Te avisaremos cuando llegue.`}
        </Alert>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {f.application?.conversation_id && (
          <ButtonLink href={`/mensajes/${f.application.conversation_id}`} variant="secondary">
            <MessageCircle className="h-4 w-4" />
            Ir al chat
          </ButtonLink>
        )}
        {isPublisher && f.adopter && (
          <ReportButton targetType="user" targetId={f.adopter.id} signedIn variant="link" />
        )}
      </div>
    </Container>
  );
}
