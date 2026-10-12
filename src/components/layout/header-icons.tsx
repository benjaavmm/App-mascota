"use client";

import { Bell, MessageCircle } from "lucide-react";
import Link from "next/link";

import { CountBadge, useUnread } from "@/components/layout/unread-provider";

export function HeaderIcons() {
  const { messages, notifications } = useUnread();
  return (
    <>
      <Link
        href="/mensajes"
        className="relative hidden rounded-full p-2 text-stone-700 hover:bg-stone-100 md:inline-flex"
        aria-label={messages ? `Mensajes (${messages} sin leer)` : "Mensajes"}
      >
        <MessageCircle className="h-6 w-6" />
        <CountBadge count={messages} />
      </Link>
      <Link
        href="/notificaciones"
        className="relative inline-flex rounded-full p-2 text-stone-700 hover:bg-stone-100"
        aria-label={notifications ? `Notificaciones (${notifications} sin leer)` : "Notificaciones"}
      >
        <Bell className="h-6 w-6" />
        <CountBadge count={notifications} />
      </Link>
    </>
  );
}
