import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PetPhoto } from "@/components/pets/pet-photo";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mensajes" };

export default async function InboxPage() {
  const profile = await requireProfile("/mensajes");
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "id, starter_id, recipient_id, last_message_at, last_message_preview, last_message_sender_id, starter_last_read_at, recipient_last_read_at, created_at, pet:pets!conversations_pet_id_fkey(id, name, cover_path), starter:profiles!conversations_starter_id_fkey(id, display_name, avatar_path), recipient:profiles!conversations_recipient_id_fkey(id, display_name, avatar_path)",
    )
    .or(`starter_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader title="Mensajes" description="Conversa de forma segura sin compartir tu teléfono ni tu correo." />
      {!conversations?.length ? (
        <EmptyState
          icon={<MessageCircle className="h-12 w-12" />}
          title="Aún no tienes conversaciones"
          description="Cuando escribas sobre un perrito, o alguien te escriba por una publicación tuya, aparecerá aquí."
          action={<ButtonLink href="/mascotas">Buscar perritos</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white">
          {conversations.map((c) => {
            const iAmStarter = c.starter_id === profile.id;
            const other = iAmStarter ? c.recipient : c.starter;
            const lastRead = iAmStarter ? c.starter_last_read_at : c.recipient_last_read_at;
            const unread =
              !!c.last_message_at &&
              c.last_message_sender_id !== profile.id &&
              (!lastRead || new Date(c.last_message_at) > new Date(lastRead));
            return (
              <li key={c.id}>
                <Link href={`/mensajes/${c.id}`} className={cn("flex items-center gap-3 p-4 hover:bg-stone-50", unread && "bg-brand-50/60")}>
                  <div className="relative shrink-0">
                    <Avatar name={other?.display_name ?? "?"} path={other?.avatar_path} size="md" />
                    <PetPhoto path={c.pet?.cover_path} alt="" className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full ring-2 ring-white" sizes="24px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate", unread ? "font-extrabold" : "font-bold")}>{other?.display_name ?? "Cuenta eliminada"}</p>
                      <span className="shrink-0 text-xs text-stone-400">{formatRelative(c.last_message_at ?? c.created_at)}</span>
                    </div>
                    <p className="truncate text-xs font-semibold text-brand-700">{c.pet?.name ?? "Publicación no disponible"}</p>
                    <p className={cn("truncate text-sm", unread ? "font-semibold text-stone-800" : "text-stone-500")}>
                      {c.last_message_sender_id === profile.id && "Tú: "}
                      {c.last_message_preview ?? "Sin mensajes aún"}
                    </p>
                  </div>
                  {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Sin leer" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
