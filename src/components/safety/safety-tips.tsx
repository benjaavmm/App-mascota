import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import type { Enums } from "@/types/database";

const TIPS: Record<Enums<"listing_kind">, string[]> = {
  adoption: [
    "La adopción es gratuita. Nunca pagues “reservas”, “traslados” ni “vacunas” por adelantado.",
    "Conversa por el chat de Huellitas: tus datos quedan protegidos.",
    "Conoce a la mascota en persona, en un lugar público o acompañado/a.",
    "Firma el acta de adopción y acuerda los seguimientos.",
  ],
  lost: [
    "Desconfía de quien pida dinero para “devolverla” o “cubrir gastos” antes de verla.",
    "Pide una foto actual o videollamada antes de reunirte.",
    "Reúnete en un lugar público y ve acompañado/a.",
    "Lleva pruebas de que es tuya: fotos antiguas, carnet veterinario o registro de microchip si tiene.",
  ],
  found: [
    "Pide pruebas antes de entregarla: fotos antiguas, carnet veterinario o registro de microchip si tiene.",
    "Si tiene microchip, un veterinario o la municipalidad puede leerlo gratis.",
    "Coordina la entrega en un lugar público y ve acompañado/a.",
    "Nunca entregues tus datos bancarios ni pagues por recuperar a una mascota.",
  ],
};

export function SafetyTips({ kind }: { kind: Enums<"listing_kind"> }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-teal-200 bg-teal-50 p-5">
      <p className="flex items-center gap-2 font-extrabold text-teal-900">
        <ShieldCheck className="h-5 w-5" />
        Para tu seguridad
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-teal-900">
        {TIPS[kind].map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/seguridad"
        className="mt-3 inline-block text-sm font-bold text-teal-800 underline underline-offset-2"
      >
        Ver guía completa de seguridad
      </Link>
    </div>
  );
}
