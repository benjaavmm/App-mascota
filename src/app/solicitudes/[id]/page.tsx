import { ArrowLeft, CheckCircle2, FileText, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { completeAdoption, reviewApplication, withdrawApplication } from "@/actions/applications";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { VerifiedBadge } from "@/components/pets/pet-badges";
import { PetPhoto } from "@/components/pets/pet-photo";
import { ReportButton } from "@/components/safety/report-button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardSection, Container } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { requireProfile } from "@/lib/auth";
import { placeLabel } from "@/lib/chile";
import {
  ACCOUNT_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  HOUSING_TENURE_LABELS,
  HOUSING_TYPE_LABELS,
} from "@/lib/constants";
import { formatDate, formatRelative } from "@/lib/format";
import { toProfileStats } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { firstParam, isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Solicitud de adopción" };

function Answer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <dt className="text-sm font-bold text-stone-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-stone-800">{children}</dd>
    </div>
  );
}

const yesNo = (v: boolean | null) => (v === null ? "—" : v ? "Sí" : "No");

export default async function ApplicationPage({ params, searchParams }: PageProps<"/solicitudes/[id]">) {
  const { id } = await params;
  const justSent = firstParam((await searchParams).enviada) === "1";
  const profile = await requireProfile(`/solicitudes/${id}`);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select(
      "*, pet:pets!applications_pet_id_fkey(id, name, cover_path, status, commune_code), applicant:profiles!applications_applicant_id_fkey(id, display_name, avatar_path, account_type, verification_status, commune_code, created_at), publisher:profiles!applications_publisher_id_fkey(id, display_name, avatar_path, account_type, verification_status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!app) notFound();

  const isPublisher = app.publisher_id === profile.id;
  const isApplicant = app.applicant_id === profile.id;
  const other = isPublisher ? app.applicant : app.publisher;
  const petName = app.pet?.name ?? "el perrito";

  const [{ data: statsData }, { data: followups }] = await Promise.all([
    isPublisher
      ? supabase.rpc("get_profile_stats", { p_user_id: app.applicant_id })
      : Promise.resolve({ data: null }),
    app.status === "completed"
      ? supabase
          .from("followups")
          .select("id, label, due_on, submitted_at")
          .eq("application_id", app.id)
          .order("due_on")
      : Promise.resolve({ data: null }),
  ]);
  const applicantStats = toProfileStats(statsData);
  const fields = { application_id: app.id };

  const timeline = [
    { label: "Solicitud enviada", date: app.created_at },
    app.decided_at && app.status !== "pending"
      ? {
          label:
            app.status === "completed" || app.status === "approved"
              ? "Solicitud aprobada"
              : `Solicitud ${APPLICATION_STATUS_LABELS[app.status].toLowerCase()}`,
          date: app.decided_at,
        }
      : null,
    app.completed_at ? { label: "Adopción concretada", date: app.completed_at } : null,
  ].filter(Boolean) as { label: string; date: string }[];

  return (
    <Container className="max-w-5xl py-8 sm:py-10">
      <Link
        href={isPublisher ? "/solicitudes?vista=recibidas" : "/solicitudes"}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Solicitudes
      </Link>

      {justSent && (
        <Alert variant="success" title="¡Solicitud enviada!" className="mb-6">
          Quien publicó a {petName} revisará tus respuestas. Te avisaremos cada vez que cambie el estado.
          Mientras tanto, puedes conversar por el chat.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="flex items-center gap-4 p-4 sm:p-5">
            <PetPhoto
              path={app.pet?.cover_path}
              alt={petName}
              className="h-20 w-24 shrink-0 rounded-2xl"
              sizes="96px"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold">Adopción de {petName}</h1>
                <ApplicationStatusBadge status={app.status} />
              </div>
              {app.pet && (
                <Link
                  href={`/mascotas/${app.pet.id}`}
                  className="text-sm font-bold text-brand-700 hover:underline"
                >
                  Ver publicación
                </Link>
              )}
            </div>
          </Card>

          {app.decision_message && (
            <Alert
              variant={app.status === "rejected" || app.status === "cancelled" ? "warning" : "info"}
              title="Mensaje de quien publicó"
            >
              {app.decision_message}
            </Alert>
          )}

          {app.status === "approved" && (
            <Alert variant="success" title="Solicitud aprobada: próximos pasos">
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>Coordinen la entrega por el chat. Reúnanse en un lugar seguro o en compañía.</li>
                <li>Revisen y firmen juntos el acta de adopción.</li>
                <li>
                  {isPublisher
                    ? "Cuando la entrega se concrete, confírmala aquí."
                    : "Quien publicó confirmará la entrega en la app."}
                </li>
              </ol>
              <p className="mt-2 font-semibold">Recuerda: adoptar es gratis. Nadie debe pedirte dinero.</p>
            </Alert>
          )}

          <CardSection title="Respuestas del cuestionario">
            <dl className="divide-y divide-stone-100">
              <Answer label="Vivienda">
                {HOUSING_TYPE_LABELS[app.housing_type]} · {HOUSING_TENURE_LABELS[app.housing_tenure]}
                {app.housing_tenure === "rented" &&
                  ` · Arriendo permite mascotas: ${yesNo(app.landlord_allows_pets)}`}
              </Answer>
              <Answer label="Patio o terraza cerrada">{yesNo(app.has_secure_yard)}</Answer>
              <Answer label="Personas en el hogar">
                {app.adults_count} adulto(s), {app.children_count} niño(s)
                {app.children_ages ? ` (${app.children_ages})` : ""}
                {" · "}Todos están de acuerdo: {yesNo(app.household_agrees)}
              </Answer>
              <Answer label="Otras mascotas">{app.other_pets ?? "No tiene"}</Answer>
              <Answer label="Horas al día que estaría solo/a">{app.hours_alone} h</Answer>
              <Answer label="Experiencia con perros">{app.experience}</Answer>
              <Answer label="Motivación">{app.motivation}</Answer>
              <Answer label="Plan ante vacaciones o cambios">{app.care_plan}</Answer>
              <Answer label="Compromisos aceptados">
                <ul className="space-y-1">
                  {[
                    "Atención veterinaria, vacunas y alimentación",
                    "Esterilización e inscripción en el Registro Nacional de Mascotas",
                    "Seguimientos a 1 semana, 1, 3 y 6 meses",
                    "Devolverlo antes que abandonarlo",
                  ].map((c) => (
                    <li key={c} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" /> {c}
                    </li>
                  ))}
                </ul>
              </Answer>
            </dl>
          </CardSection>

          {followups && followups.length > 0 && (
            <CardSection title="Seguimientos" description="Recordatorios para saber cómo está.">
              <ul className="divide-y divide-stone-100">
                {followups.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/seguimientos/${f.id}`}
                      className="flex items-center justify-between py-3 hover:underline"
                    >
                      <span className="font-semibold">{f.label}</span>
                      <span className="text-sm text-stone-500">
                        {f.submitted_at ? "Enviado ✓" : `Fecha: ${formatDate(f.due_on)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardSection>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {other && (
            <Card className="p-5">
              <p className="mb-3 text-xs font-bold tracking-wide text-stone-500 uppercase">
                {isPublisher ? "Postulante" : "Publicado por"}
              </p>
              <Link href={`/usuarios/${other.id}`} className="flex items-center gap-3">
                <Avatar name={other.display_name} path={other.avatar_path} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-extrabold hover:underline">{other.display_name}</p>
                  <p className="text-sm text-stone-500">{ACCOUNT_TYPE_LABELS[other.account_type]}</p>
                  {other.verification_status === "verified" && <VerifiedBadge />}
                </div>
              </Link>
              {isPublisher && app.applicant && (
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Comuna</dt>
                    <dd className="font-semibold">{placeLabel(app.applicant.commune_code)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">En Huellitas desde</dt>
                    <dd className="font-semibold">{formatDate(app.applicant.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Adopciones previas</dt>
                    <dd className="font-semibold">{applicantStats.adoptions_received}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Seguimientos al día</dt>
                    <dd className="font-semibold">{applicantStats.followups_on_time}</dd>
                  </div>
                </dl>
              )}
              <div className="mt-4 space-y-2">
                {app.conversation_id && (
                  <ButtonLink
                    href={`/mensajes/${app.conversation_id}`}
                    variant="secondary"
                    className="w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Ir al chat
                  </ButtonLink>
                )}
                {(app.status === "approved" || app.status === "completed") && (
                  <ButtonLink href={`/solicitudes/${app.id}/acta`} variant="soft" className="w-full">
                    <FileText className="h-4 w-4" />
                    Acta de adopción
                  </ButtonLink>
                )}
              </div>
              <div className="mt-3 text-center">
                <ReportButton
                  targetType="user"
                  targetId={other.id}
                  signedIn
                  variant="link"
                  className="text-xs"
                />
              </div>
            </Card>
          )}

          {isPublisher && ["pending", "reviewing", "approved"].includes(app.status) && (
            <Card className="space-y-2.5 p-5">
              <p className="font-extrabold">Tu decisión</p>
              {app.status === "pending" && (
                <ConfirmAction
                  action={reviewApplication}
                  fields={{ ...fields, status: "reviewing" }}
                  label="Marcar en revisión"
                  title="¿Marcar como en revisión?"
                  description="Le avisaremos a la persona que estás revisando su solicitud."
                  className="w-full"
                />
              )}
              {(app.status === "pending" || app.status === "reviewing") && (
                <>
                  <ConfirmAction
                    action={reviewApplication}
                    fields={{ ...fields, status: "approved" }}
                    label="Aprobar solicitud"
                    variant="success"
                    confirmVariant="success"
                    confirmLabel="Aprobar"
                    title={`¿Aprobar a ${other?.display_name ?? "esta persona"}?`}
                    description={`${petName} quedará “en proceso” y no recibirá nuevas solicitudes. Luego coordinen la entrega.`}
                    messageField={{
                      name: "message",
                      label: "Mensaje (opcional)",
                      placeholder: "¡Hola! Me encantaría que nos conozcamos…",
                    }}
                    className="w-full"
                  />
                  <ConfirmAction
                    action={reviewApplication}
                    fields={{ ...fields, status: "rejected" }}
                    label="No aceptar"
                    variant="danger-soft"
                    confirmVariant="danger"
                    confirmLabel="Enviar respuesta"
                    title="No aceptar la solicitud"
                    description="Escribe un mensaje respetuoso. A nadie le gusta un “no” sin explicación."
                    messageField={{ name: "message", label: "Mensaje", required: true }}
                    className="w-full"
                  />
                </>
              )}
              {app.status === "approved" && (
                <>
                  <ConfirmAction
                    action={completeAdoption}
                    fields={fields}
                    label="Confirmar adopción"
                    variant="success"
                    confirmVariant="success"
                    confirmLabel="Confirmar entrega"
                    title={`Confirmar la adopción de ${petName}`}
                    description="Haz esto solo cuando la entrega ya se haya realizado."
                    className="w-full"
                  >
                    <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
                      <li>Se conocieron en persona y la entrega fue en un lugar seguro.</li>
                      <li>Revisaron y firmaron el acta de adopción.</li>
                      <li>No hubo cobro de dinero.</li>
                    </ul>
                    <label className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        name="handover_confirmed"
                        required
                        className="mt-0.5 h-5 w-5 accent-brand-600"
                      />
                      Confirmo que la entrega se realizó y se cumplieron estos puntos.
                    </label>
                  </ConfirmAction>
                  <ConfirmAction
                    action={reviewApplication}
                    fields={{ ...fields, status: "cancelled" }}
                    label="Cancelar aprobación"
                    variant="ghost"
                    confirmVariant="danger"
                    confirmLabel="Cancelar aprobación"
                    title="¿Cancelar la aprobación?"
                    description={`${petName} volverá a estar disponible.`}
                    messageField={{ name: "message", label: "Motivo", required: true }}
                    className="w-full"
                  />
                </>
              )}
            </Card>
          )}

          {isApplicant && ["pending", "reviewing", "approved"].includes(app.status) && (
            <ConfirmAction
              action={withdrawApplication}
              fields={fields}
              label="Retirar mi solicitud"
              variant="ghost"
              confirmVariant="danger"
              confirmLabel="Retirar"
              title="¿Retirar tu solicitud?"
              description="Le avisaremos a quien publicó. Esta acción no se puede deshacer."
              className="w-full"
            />
          )}

          <Card className="p-5">
            <p className="mb-3 font-extrabold">Historial</p>
            <ol className="space-y-3 border-l-2 border-stone-200 pl-4">
              {timeline.map((item) => (
                <li key={item.label} className="relative">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-brand-500" />
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-stone-500">{formatRelative(item.date)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
