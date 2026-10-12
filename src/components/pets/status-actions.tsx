import { setPetStatus } from "@/actions/pets";
import { ConfirmAction } from "@/components/ui/confirm-action";
import type { Enums } from "@/types/database";

type Status = Enums<"pet_status">;

// Acciones de estado disponibles para quien publicó.
export function StatusActions({
  petId,
  kind,
  status,
  name,
  hasApproved,
  size = "sm",
}: {
  petId: string;
  kind: Enums<"listing_kind">;
  status: Status;
  name: string;
  hasApproved?: boolean;
  size?: "sm" | "md";
}) {
  const actions: {
    status: Status;
    label: string;
    title: string;
    description: string;
    variant?: "secondary" | "success" | "danger-soft";
  }[] = [];

  if (status === "in_process" || hasApproved) {
    return (
      <p className="text-sm text-stone-500">
        Hay una solicitud aprobada. Confirma o cancela la adopción desde la solicitud.
      </p>
    );
  }

  if (status === "available") {
    actions.push({
      status: "paused",
      label: "Pausar",
      title: `¿Pausar la publicación de ${name}?`,
      description: "Dejará de aparecer en las búsquedas. Puedes reactivarla cuando quieras.",
    });
  }
  if (status === "paused" || status === "archived") {
    actions.push({
      status: "available",
      label: "Reactivar",
      title: `¿Reactivar la publicación de ${name}?`,
      description: "Volverá a aparecer en las búsquedas.",
      variant: "success",
    });
  }
  if (kind === "adoption" && (status === "available" || status === "paused")) {
    actions.push({
      status: "adopted",
      label: "Fue adoptado por otro medio",
      title: `¿${name} fue adoptado fuera de Huellitas?`,
      description: "Las solicitudes abiertas se cerrarán y se avisará a cada postulante.",
    });
  }
  if (kind !== "adoption" && (status === "available" || status === "paused")) {
    actions.push({
      status: "reunited",
      label: kind === "lost" ? "¡Volvió a casa!" : "Ya está con su familia",
      title: `¡Qué buena noticia! ¿${name} volvió con su familia?`,
      description: "La publicación quedará como un final feliz.",
      variant: "success",
    });
  }
  if (status !== "archived") {
    actions.push({
      status: "archived",
      label: "Archivar",
      title: `¿Archivar la publicación de ${name}?`,
      description: "Dejará de ser visible y se cerrarán las solicitudes abiertas.",
      variant: "danger-soft",
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <ConfirmAction
          key={a.status}
          action={setPetStatus}
          fields={{ pet_id: petId, status: a.status }}
          label={a.label}
          title={a.title}
          description={a.description}
          variant={a.variant ?? "secondary"}
          confirmVariant={a.variant === "danger-soft" ? "danger" : "primary"}
          size={size}
        />
      ))}
    </div>
  );
}
