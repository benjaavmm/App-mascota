import { BadgeCheck, Clock, EyeOff, Siren } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { KIND_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { Enums } from "@/types/database";

export function KindBadge({ kind }: { kind: Enums<"listing_kind"> }) {
  if (kind === "adoption") return null;
  return <Badge tone={kind === "lost" ? "rose" : "sky"}>{KIND_LABELS[kind]}</Badge>;
}

export function UrgentBadge() {
  return (
    <Badge tone="rose" icon={<Siren className="h-3 w-3" />}>
      Urgente
    </Badge>
  );
}

export function StatusBadge({ status, kind }: { status: Enums<"pet_status">; kind: Enums<"listing_kind"> }) {
  if (status === "available") {
    return <Badge tone="teal">{kind === "adoption" ? "Disponible" : "Buscando"}</Badge>;
  }
  const tone =
    status === "adopted" || status === "reunited" ? "violet" : status === "in_process" ? "amber" : "neutral";
  const icon = status === "in_process" ? <Clock className="h-3 w-3" /> : undefined;
  return (
    <Badge tone={tone} icon={icon}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function HiddenBadge() {
  return (
    <Badge tone="rose" icon={<EyeOff className="h-3 w-3" />}>
      Oculta por moderación
    </Badge>
  );
}

export function VerifiedBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"
      title="Cuenta verificada por el equipo de AyudaPatitas"
    >
      <BadgeCheck className="h-4 w-4" aria-hidden />
      {compact ? <span className="sr-only">Verificada</span> : "Verificada"}
    </span>
  );
}
