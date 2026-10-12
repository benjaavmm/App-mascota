import { todayIso } from "@/lib/format";

export type FollowupState = "submitted" | "upcoming" | "due" | "overdue";

export function followupState(f: { due_on: string; submitted_at: string | null }): FollowupState {
  if (f.submitted_at) return "submitted";
  const today = new Date(`${todayIso()}T12:00:00`);
  const due = new Date(`${f.due_on}T12:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days > 7) return "upcoming";
  if (days < -14) return "overdue";
  return "due";
}

export const FOLLOWUP_STATE_LABELS: Record<FollowupState, string> = {
  submitted: "Enviado",
  upcoming: "Próximo",
  due: "Pendiente",
  overdue: "Atrasado",
};
