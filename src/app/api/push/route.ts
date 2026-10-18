import { timingSafeEqual } from "node:crypto";

import webpush from "web-push";

import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// La base de datos llama a esta ruta cada vez que crea una notificación (ver la migración 000800_push).
// Envía el aviso a los navegadores donde la persona activó las notificaciones.

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!secret || !publicKey || !privateKey) {
    return Response.json({ error: "Notificaciones push no configuradas." }, { status: 503 });
  }
  if (!sameSecret(request.headers.get("x-push-secret") ?? "", secret)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  const admin = createAdminClient();
  if (!admin || typeof id !== "string") {
    return Response.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const { data: notification } = await admin
    .from("notifications")
    .select("id, user_id, title, body, link, read_at")
    .eq("id", id)
    .maybeSingle();
  if (!notification || notification.read_at) {
    return Response.json({ sent: 0 });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id);
  if (!subs?.length) {
    return Response.json({ sent: 0 });
  }

  // Los servicios de push exigen un contacto https: o mailto: (en desarrollo el sitio es http://localhost).
  const subject = SITE_URL.startsWith("https://") ? SITE_URL : "https://www.ayudapatitas.cl";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    return Response.json({ error: "Claves VAPID no válidas." }, { status: 500 });
  }
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    // Abre la notificación dentro de la app (la marca como leída y lleva al enlace).
    url: notification.link ? `/notificaciones/${notification.id}` : "/notificaciones",
    tag: notification.id,
  });

  let sent = 0;
  const expired: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          {
            TTL: 60 * 60 * 24,
            urgency: "high",
          },
        );
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(s.id);
      }
    }),
  );
  if (expired.length) {
    await admin.from("push_subscriptions").delete().in("id", expired);
  }
  return Response.json({ sent, expired: expired.length });
}
