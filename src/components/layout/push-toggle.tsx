"use client";

import { BellOff, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { deletePushSubscription, savePushSubscription } from "@/actions/push";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

// Tarjeta para activar las notificaciones en este celular o computador.
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      let next: State;
      if (
        !PUBLIC_KEY ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        next = ios && !standalone ? "ios-install" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const reg = await registration().catch(() => null);
        const sub = await reg?.pushManager.getSubscription().catch(() => null);
        next = sub && Notification.permission === "granted" ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(PUBLIC_KEY),
        }));
      const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
      if (res.error) {
        setError(res.error);
        return;
      }
      setState("on");
    } catch {
      setError("No pudimos activar las notificaciones. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || (compact && (state === "on" || state === "unsupported"))) return null;

  const text: Record<Exclude<State, "loading">, string> = {
    on: "Las notificaciones están activadas en este dispositivo.",
    off: "Activa las notificaciones para enterarte al tiro de mensajes, solicitudes y posibles coincidencias, aunque no tengas la app abierta.",
    denied:
      "Bloqueaste las notificaciones. Para activarlas, entra a los ajustes del navegador, busca ayudapatitas.cl y permite las notificaciones.",
    "ios-install":
      "En iPhone, primero instala la app: en Safari toca Compartir → “Agregar a pantalla de inicio”. Luego ábrela desde el ícono y activa aquí las notificaciones.",
    unsupported: "Este navegador no permite notificaciones. Prueba con Chrome o instala la app.",
  };

  return (
    <Card className="mb-6 flex flex-col gap-3 border-brand-200 bg-brand-50/60 p-4 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        {state === "on" ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1 text-sm text-stone-700">
        <p>{text[state]}</p>
        {error && <p className="mt-1 font-semibold text-rose-700">{error}</p>}
      </div>
      {state === "off" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className={buttonClasses({ className: "shrink-0" })}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Activar notificaciones
        </button>
      )}
      {state === "on" && (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className={buttonClasses({ variant: "ghost", size: "sm", className: "shrink-0" })}
        >
          Desactivar
        </button>
      )}
    </Card>
  );
}

// Campo oculto para "Cerrar sesión": indica qué dispositivo deja de recibir avisos de esta cuenta.
export function PushEndpointField() {
  const [endpoint, setEndpoint] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? ""))
      .catch(() => {});
  }, []);
  return <input type="hidden" name="push_endpoint" value={endpoint} />;
}
