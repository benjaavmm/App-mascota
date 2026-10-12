import { Badge, type BadgeTone } from "@/components/ui/badge";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import type { Enums } from "@/types/database";

const TONES: Record<Enums<"application_status">, BadgeTone> = {
  pending: "amber",
  reviewing: "sky",
  approved: "teal",
  rejected: "rose",
  withdrawn: "neutral",
  cancelled: "neutral",
  completed: "violet",
};

export function ApplicationStatusBadge({ status }: { status: Enums<"application_status"> }) {
  return <Badge tone={TONES[status]}>{APPLICATION_STATUS_LABELS[status]}</Badge>;
}
