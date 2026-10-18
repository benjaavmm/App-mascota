"use client";

import { usePathname } from "next/navigation";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { savePushSubscription } from "@/actions/push";
import { createClient } from "@/lib/supabase/client";

type Counts = { notifications: number; messages: number };

const UnreadContext = createContext<Counts>({ notifications: 0, messages: 0 });

export function useUnread() {
  return use(UnreadContext);
}

// Mantiene al día los contadores de mensajes y notificaciones sin leer usando Supabase Realtime.
export function UnreadProvider({
  userId,
  initial,
  children,
}: {
  userId: string | null;
  initial: Counts;
  children: ReactNode;
}) {
  const [counts, setCounts] = useState(initial);
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (!userId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await createClient().rpc("my_unread_counts");
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setCounts({
          notifications: Number((data as Record<string, unknown>).notifications) || 0,
          messages: Number((data as Record<string, unknown>).messages) || 0,
        });
      }
    }, 400);
  }, [userId]);

  // Al navegar (p. ej., al abrir una conversación) se recalculan los contadores.
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;
    const channel = supabase.channel(`unread:${userId}`);

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          refresh,
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Si este dispositivo ya tenía los avisos activados, se asocian a la cuenta que inició sesión
  // (una vez por sesión del navegador), para que sigan llegando aunque se cambie de cuenta.
  useEffect(() => {
    if (!userId || !("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const key = `push-sync:${userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return;
        const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
        if (res.error) return;
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
      })
      .catch(() => {});
  }, [userId]);

  return <UnreadContext value={counts}>{children}</UnreadContext>;
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={
        "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-extrabold text-white ring-2 ring-white " +
        (className ?? "")
      }
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
