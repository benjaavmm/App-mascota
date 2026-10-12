import { moderatePetAction, setAccountStatusAction } from "@/actions/admin";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Input } from "@/components/ui/field";
import type { Enums } from "@/types/database";

export function PetModerationAction({ petId, petName, hidden }: { petId: string; petName: string; hidden: boolean }) {
  return hidden ? (
    <ConfirmAction
      action={moderatePetAction}
      fields={{ pet_id: petId, hide: "0" }}
      label="Restaurar publicación"
      variant="secondary"
      size="sm"
      confirmVariant="success"
      title={`¿Restaurar la publicación de ${petName}?`}
      description="Volverá a ser visible y se notificará a quien la publicó."
    />
  ) : (
    <ConfirmAction
      action={moderatePetAction}
      fields={{ pet_id: petId, hide: "1" }}
      label="Ocultar publicación"
      variant="danger-soft"
      size="sm"
      confirmVariant="danger"
      confirmLabel="Ocultar"
      title={`¿Ocultar la publicación de ${petName}?`}
      description="Dejará de ser visible. La persona recibirá el motivo."
      messageField={{ name: "reason", label: "Motivo (lo verá la persona)", required: true }}
    />
  );
}

export function AccountModerationActions({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: Enums<"account_status">;
}) {
  if (status !== "active") {
    return (
      <ConfirmAction
        action={setAccountStatusAction}
        fields={{ user_id: userId, status: "active" }}
        label="Reactivar cuenta"
        variant="secondary"
        size="sm"
        confirmVariant="success"
        title={`¿Reactivar la cuenta de ${name}?`}
        messageField={{ name: "reason", label: "Nota (opcional)" }}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        action={setAccountStatusAction}
        fields={{ user_id: userId, status: "suspended" }}
        label="Suspender"
        variant="danger-soft"
        size="sm"
        confirmVariant="danger"
        confirmLabel="Suspender"
        title={`Suspender a ${name}`}
        description="No podrá publicar, postular ni enviar mensajes durante la suspensión. Sus publicaciones dejarán de verse."
        messageField={{ name: "reason", label: "Motivo (lo verá la persona)", required: true }}
      >
        <Field label="Días de suspensión" htmlFor={`days-${userId}`}>
          <Input id={`days-${userId}`} name="days" type="number" min={1} max={365} defaultValue={7} required className="max-w-32" />
        </Field>
      </ConfirmAction>
      <ConfirmAction
        action={setAccountStatusAction}
        fields={{ user_id: userId, status: "banned" }}
        label="Bloquear cuenta"
        variant="danger"
        size="sm"
        confirmVariant="danger"
        confirmLabel="Bloquear definitivamente"
        title={`Bloquear la cuenta de ${name}`}
        description="Para casos graves: venta de animales, maltrato, estafas o acoso. Puedes revertirlo después."
        messageField={{ name: "reason", label: "Motivo (lo verá la persona)", required: true }}
      />
    </div>
  );
}
