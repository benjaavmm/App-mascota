import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  ClipboardList,
  HeartHandshake,
  MessageCircle,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { markAllNotificationsRead } from "@/actions/profile";
import { PushToggle } from "@/components/layout/push-toggle";
import { Container, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificaciones" };

function iconFor(type: string): { icon: LucideIcon; className: string } {
  if (type.startsWith("application")) return { icon: ClipboardList, className: "bg-brand-100 text-brand-700" };
  if (type.startsWith("followup") || type === "adoption_completed") return { icon: HeartHandshake, className: "bg-violet-100 text-violet-700" };
  if (type === "message" || type === "contact_shared") return { icon: MessageCircle, className: "bg-sky-100 text-sky-700" };
  if (type === "possible_match") return { icon: Search, className: "bg-teal-100 text-teal-700" };
  if (type === "pet_alert") return { icon: BellRing, className: "bg-amber-100 text-amber-700" };
  if (type.startsWith("report") || type.startsWith("pet_hidden") || type === "account_status")
    return { icon: AlertTriangle, className: "bg-rose-100 text-rose-700" };
  if (type.startsWith("verification")) return { icon: ShieldCheck, className: "bg-teal-100 text-teal-700" };
  return { icon: Bell, className: "bg-stone-100 text-stone-600" };
}

export default async function NotificationsPage() {
  const user = await requireUser("/notificaciones");
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        title="Notificaciones"
        description={unread ? `Tienes ${unread} sin leer.` : "Estás al día."}
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <SubmitButton variant="secondary" size="sm">
                <CheckCheck className="h-4 w-4" />
                Marcar todo como leído
              </SubmitButton>
            </form>
          ) : null
        }
      />
      <PushToggle />
      {!notifications?.length ? (
        <EmptyState icon={<Bell className="h-12 w-12" />} title="No tienes notificaciones" description="Aquí verás novedades de tus solicitudes, mensajes y publicaciones." />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white">
          {notifications.map((n) => {
            const { icon: Icon, className } = iconFor(n.type);
            const content = (
              <>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", className)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[15px]", n.read_at ? "font-semibold text-stone-700" : "font-extrabold text-stone-900")}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 text-sm text-stone-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-stone-400">{formatRelative(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Sin leer" />}
              </>
            );
            return (
              <li key={n.id} className={cn(!n.read_at && "bg-brand-50/50")}>
                {n.link ? (
                  <Link href={`/notificaciones/${n.id}`} prefetch={false} className="flex gap-3 p-4 hover:bg-stone-50">
                    {content}
                  </Link>
                ) : (
                  <div className="flex gap-3 p-4">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
