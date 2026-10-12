import { ArrowLeft, Ban, ClipboardList, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { blockUser, unblockUser } from "@/actions/safety";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ChatRoom, type ChatMessage } from "@/components/chat/chat-room";
import { ContactPanel } from "@/components/chat/contact-panel";
import { VerifiedBadge } from "@/components/pets/pet-badges";
import { PetPhoto } from "@/components/pets/pet-photo";
import { ReportButton } from "@/components/safety/report-button";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { isAccountActive, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Conversación" };

const PAGE = 50;

export default async function ConversationPage({ params }: PageProps<"/mensajes/[id]">) {
  const { id } = await params;
  const profile = await requireProfile(`/mensajes/${id}`);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, starter_id, recipient_id, starter_shared_contact_at, recipient_shared_contact_at, pet:pets!conversations_pet_id_fkey(id, name, cover_path, kind), starter:profiles!conversations_starter_id_fkey(id, display_name, avatar_path, verification_status, account_status), recipient:profiles!conversations_recipient_id_fkey(id, display_name, avatar_path, verification_status, account_status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const iAmStarter = conv.starter_id === profile.id;
  const other = iAmStarter ? conv.recipient : conv.starter;
  const otherId = iAmStarter ? conv.recipient_id : conv.starter_id;
  const iShared = Boolean(iAmStarter ? conv.starter_shared_contact_at : conv.recipient_shared_contact_at);

  const [{ data: rawMessages }, { data: contactRows }, { data: block }, { data: application }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("id, sender_id, kind, body, safety_flag, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(PAGE),
      supabase.rpc("get_conversation_contact", { p_conversation_id: id }),
      supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", profile.id)
        .eq("blocked_id", otherId)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("id, status")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const messages = ((rawMessages ?? []) as ChatMessage[]).reverse();
  const contact = contactRows?.[0] ?? null;
  const blockedByMe = Boolean(block);
  const otherActive = other?.account_status === "active";
  const canSend = !blockedByMe && otherActive && isAccountActive(profile);
  const otherName = other?.display_name ?? "Cuenta eliminada";

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem-4.5rem)] w-full max-w-6xl gap-6 px-0 sm:px-6 md:h-[calc(100dvh-4rem)] md:py-6">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-stone-200 bg-stone-50 sm:rounded-[var(--radius-card)] sm:border">
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-3 py-3 sm:px-5">
          <Link
            href="/mensajes"
            className="rounded-full p-1.5 text-stone-600 hover:bg-stone-100"
            aria-label="Volver a mensajes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Avatar name={otherName} path={other?.avatar_path} size="sm" />
          <div className="min-w-0 flex-1">
            <Link
              href={other ? `/usuarios/${other.id}` : "#"}
              className="flex items-center gap-1.5 font-extrabold hover:underline"
            >
              <span className="truncate">{otherName}</span>
              {other?.verification_status === "verified" && <VerifiedBadge compact />}
            </Link>
            {conv.pet && (
              <Link
                href={`/mascotas/${conv.pet.id}`}
                className="block truncate text-xs font-semibold text-brand-700 hover:underline"
              >
                Sobre {conv.pet.name}
              </Link>
            )}
          </div>
          {application && (
            <Link href={`/solicitudes/${application.id}`} className="hidden items-center gap-1.5 sm:flex">
              <ClipboardList className="h-4 w-4 text-stone-500" />
              <ApplicationStatusBadge status={application.status} />
            </Link>
          )}
          {/* En pantallas pequeñas, contacto y seguridad se muestran en un menú desplegable. */}
          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full px-2 py-1.5 text-xs font-bold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              Contacto
            </summary>
            <div className="absolute top-11 right-0 z-30 w-[calc(100vw-1.5rem)] max-w-sm space-y-4 rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-stone-200">
              <ContactPanel
                conversationId={conv.id}
                otherName={otherName}
                iShared={iShared}
                contact={contact}
                canShare={canSend}
              />
              {other && (
                <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                  <ReportButton targetType="user" targetId={other.id} signedIn variant="button" />
                  {blockedByMe ? (
                    <ConfirmAction
                      action={unblockUser}
                      fields={{ user_id: other.id }}
                      label="Desbloquear"
                      variant="ghost"
                      size="sm"
                      title={`¿Desbloquear a ${otherName}?`}
                    />
                  ) : (
                    <ConfirmAction
                      action={blockUser}
                      fields={{ user_id: other.id }}
                      label={
                        <>
                          <Ban className="h-4 w-4" />
                          Bloquear
                        </>
                      }
                      variant="ghost"
                      size="sm"
                      confirmVariant="danger"
                      confirmLabel="Bloquear"
                      title={`¿Bloquear a ${otherName}?`}
                      description="No podrán escribirse ni postular a sus publicaciones."
                    />
                  )}
                </div>
              )}
            </div>
          </details>
        </header>
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Adoptar es gratis. Nunca pagues por adelantado ni compartas claves o códigos. Reúnanse en lugares
          públicos.
        </div>
        <ChatRoom
          conversationId={conv.id}
          meId={profile.id}
          otherName={otherName}
          initialMessages={messages}
          hasMore={messages.length === PAGE}
          canSend={canSend}
          disabledReason={
            blockedByMe
              ? "Bloqueaste a esta persona. Desbloquéala para volver a escribir."
              : !otherActive
                ? "Esta cuenta no está disponible."
                : "Tu cuenta está suspendida."
          }
        />
      </section>

      <aside className="hidden w-80 shrink-0 space-y-5 overflow-y-auto lg:block">
        {conv.pet && (
          <Link
            href={`/mascotas/${conv.pet.id}`}
            className="block overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white"
          >
            <PetPhoto path={conv.pet.cover_path} alt={conv.pet.name} className="aspect-[4/3]" sizes="320px" />
            <p className="p-4 font-extrabold">{conv.pet.name}</p>
          </Link>
        )}
        <div className="rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
          <ContactPanel
            conversationId={conv.id}
            otherName={otherName}
            iShared={iShared}
            contact={contact}
            canShare={canSend}
          />
        </div>
        <div className="space-y-2 rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
          <p className="font-extrabold">Seguridad</p>
          {other && (
            <>
              <ReportButton
                targetType="user"
                targetId={other.id}
                signedIn
                variant="button"
                className="w-full justify-start"
              />
              {blockedByMe ? (
                <ConfirmAction
                  action={unblockUser}
                  fields={{ user_id: other.id }}
                  label="Desbloquear"
                  variant="ghost"
                  size="sm"
                  title={`¿Desbloquear a ${otherName}?`}
                  description="Podrán volver a escribirse."
                  className="w-full justify-start"
                />
              ) : (
                <ConfirmAction
                  action={blockUser}
                  fields={{ user_id: other.id }}
                  label={
                    <>
                      <Ban className="h-4 w-4" />
                      Bloquear
                    </>
                  }
                  variant="ghost"
                  size="sm"
                  confirmVariant="danger"
                  confirmLabel="Bloquear"
                  title={`¿Bloquear a ${otherName}?`}
                  description="No podrán escribirse ni postular a sus publicaciones. Puedes desbloquear cuando quieras."
                  className="w-full justify-start text-rose-700"
                />
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
