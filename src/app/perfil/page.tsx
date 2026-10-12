import { BadgeCheck, ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/actions/auth";
import { unblockUser } from "@/actions/safety";
import { VerifiedBadge } from "@/components/dogs/dog-badges";
import {
  AvatarUploader,
  ChangePasswordForm,
  DeleteAccountForm,
  ProfileForm,
  VerificationForm,
} from "@/components/profile/profile-forms";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CardSection, Container, PageHeader } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser, isAccountActive, requireProfile } from "@/lib/auth";
import { ACCOUNT_TYPE_LABELS, REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const profile = await requireProfile("/perfil");
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: privateData }, { data: blocks }, { data: reports }, { data: lastVerification }] = await Promise.all([
    supabase.from("profile_private").select("phone").eq("user_id", profile.id).maybeSingle(),
    supabase
      .from("blocks")
      .select("blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, display_name, avatar_path)")
      .eq("blocker_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id, target_type, reason, status, created_at, resolution_note")
      .eq("reporter_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("verification_requests")
      .select("status, review_note, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        title="Mi perfil"
        action={
          <ButtonLink href={`/usuarios/${profile.id}`} variant="secondary" size="sm">
            <ExternalLink className="h-4 w-4" />
            Ver perfil público
          </ButtonLink>
        }
      />

      {!isAccountActive(profile) && (
        <Alert variant="danger" title="Tu cuenta está suspendida" className="mb-6">
          {profile.suspended_until
            ? `La suspensión termina el ${formatDate(profile.suspended_until)}.`
            : "Revisa tus notificaciones para más detalles."}
        </Alert>
      )}

      <div className="space-y-6">
        <CardSection>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <AvatarUploader userId={profile.id} name={profile.display_name} path={profile.avatar_path} />
            <div className="text-right">
              <p className="text-lg font-extrabold">{profile.display_name}</p>
              <p className="text-sm text-stone-500">{ACCOUNT_TYPE_LABELS[profile.account_type]}</p>
              {profile.verification_status === "verified" && <VerifiedBadge />}
              <p className="text-xs text-stone-400">{user?.email}</p>
            </div>
          </div>
        </CardSection>

        <CardSection title="Datos del perfil" description="Tu correo nunca se muestra públicamente.">
          <ProfileForm
            defaults={{
              display_name: profile.display_name,
              bio: profile.bio,
              account_type: profile.account_type,
              commune_code: profile.commune_code,
              phone: privateData?.phone ?? null,
              website_url: profile.website_url,
              instagram: profile.instagram,
            }}
          />
        </CardSection>

        <CardSection
          id="verificacion"
          title="Verificación de cuenta"
          description="Para rescatistas y fundaciones. La insignia genera confianza y permite publicar más perritos."
        >
          {profile.verification_status === "verified" ? (
            <Alert variant="success" title="Tu cuenta está verificada">
              Gracias por tu labor. Si cambias el tipo de cuenta, deberás verificarte nuevamente.
            </Alert>
          ) : profile.verification_status === "pending" ? (
            <Alert variant="info" title="Solicitud en revisión">
              Enviada el {formatDate(lastVerification?.created_at)}. Te avisaremos cuando moderación la revise.
            </Alert>
          ) : (
            <>
              {profile.verification_status === "rejected" && lastVerification?.review_note && (
                <Alert variant="warning" title="Tu solicitud anterior no fue aprobada" className="mb-5">
                  {lastVerification.review_note}
                </Alert>
              )}
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">
                <BadgeCheck className="h-5 w-5 shrink-0" />
                Revisamos manualmente cada solicitud: redes sociales, trayectoria y documentos. No pedimos tu carnet
                de identidad.
              </div>
              <VerificationForm userId={profile.id} defaultType={profile.account_type} />
            </>
          )}
        </CardSection>

        <CardSection title="Personas bloqueadas" description="No pueden escribirte ni postular a tus publicaciones, ni tú a las suyas.">
          {!blocks?.length ? (
            <p className="text-sm text-stone-500">No has bloqueado a nadie.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {blocks.map((b) => (
                <li key={b.blocked_id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/usuarios/${b.blocked_id}`} className="flex items-center gap-3">
                    <Avatar name={b.blocked?.display_name ?? "?"} path={b.blocked?.avatar_path} size="sm" />
                    <span className="font-semibold">{b.blocked?.display_name}</span>
                  </Link>
                  <ConfirmAction
                    action={unblockUser}
                    fields={{ user_id: b.blocked_id }}
                    label="Desbloquear"
                    variant="ghost"
                    size="sm"
                    title={`¿Desbloquear a ${b.blocked?.display_name}?`}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardSection>

        <CardSection id="reportes" title="Mis reportes" description="Los reportes son confidenciales.">
          {!reports?.length ? (
            <p className="text-sm text-stone-500">No has enviado reportes.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {reports.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{REPORT_REASON_LABELS[r.reason]}</p>
                    <Badge tone={r.status === "resolved" ? "teal" : r.status === "dismissed" ? "neutral" : "amber"}>
                      {REPORT_STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500">Enviado el {formatDate(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardSection>

        <CardSection title="Seguridad de la cuenta">
          <ChangePasswordForm />
          <form action={signOut} className="mt-6 border-t border-stone-100 pt-6">
            <SubmitButton variant="ghost">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </SubmitButton>
          </form>
        </CardSection>

        <CardSection title="Eliminar mi cuenta" className="border-rose-200">
          <p className="mb-4 text-sm text-stone-600">
            Se eliminarán tu perfil, publicaciones, fotos, mensajes y solicitudes. Esta acción no se puede deshacer.
          </p>
          <DeleteAccountForm />
        </CardSection>
      </div>
    </Container>
  );
}
