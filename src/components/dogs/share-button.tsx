"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { buttonClasses } from "@/components/ui/button";

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // La persona canceló: no hacemos nada.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia este enlace:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={buttonClasses({ variant: "secondary", size: "icon" })}
      aria-label={copied ? "Enlace copiado" : "Compartir"}
      title={copied ? "¡Enlace copiado!" : "Compartir"}
    >
      {copied ? <Check className="h-5 w-5 text-teal-600" /> : <Share2 className="h-5 w-5" />}
    </button>
  );
}
