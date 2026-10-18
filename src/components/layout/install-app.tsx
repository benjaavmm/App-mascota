"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonClasses, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// El navegador avisa una sola vez (y temprano) que la app se puede instalar: lo guardamos al cargar.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Botón "Instalar app": usa el instalador del navegador si existe; si no (iPhone), muestra los pasos.
export function InstallAppButton({
  variant = "secondary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandalone());
      setReady(true);
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    };
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  if (!ready || installed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      return;
    }
    setHelp(true);
  }

  return (
    <>
      <button type="button" onClick={install} className={buttonClasses({ variant, className })}>
        <Download className="h-4 w-4" />
        Instalar app
      </button>
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        title="Instala AyudaPatitas en tu celular"
        description="Es gratis y no necesitas pasar por ninguna tienda de aplicaciones."
      >
        {ios ? (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
            <li>
              Abre ayudapatitas.cl en <strong>Safari</strong>.
            </li>
            <li>
              Toca el botón <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba).
            </li>
            <li>
              Elige <strong>“Agregar a pantalla de inicio”</strong> y luego <strong>Agregar</strong>.
            </li>
            <li>Abre AyudaPatitas desde el nuevo ícono para recibir notificaciones.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
            <li>
              Abre ayudapatitas.cl en <strong>Chrome</strong>.
            </li>
            <li>
              Toca el menú <strong>⋮</strong> (arriba a la derecha).
            </li>
            <li>
              Elige <strong>“Instalar app”</strong> o <strong>“Agregar a pantalla de inicio”</strong>.
            </li>
          </ol>
        )}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => setHelp(false)} className={buttonClasses({})}>
            Entendido
          </button>
        </div>
      </Dialog>
    </>
  );
}
