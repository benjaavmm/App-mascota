"use client";

import { useActionState, useState, type ReactNode } from "react";

import { FormMessage } from "@/components/ui/alert";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields?: Record<string, string>;
  label: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  // Si se indica, el diálogo pide un mensaje (motivo, comentario...).
  messageField?: { name: string; label: string; required?: boolean; placeholder?: string };
  children?: ReactNode;
};

// Botón que abre un diálogo de confirmación y ejecuta una Server Action.
export function ConfirmAction({
  action,
  fields,
  label,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "secondary",
  confirmVariant = "primary",
  size = "md",
  className,
  messageField,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.ok) setOpen(false);
    return result;
  }, {});

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <form action={formAction} className="space-y-4">
          {fields &&
            Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          {children}
          {messageField && (
            <Field label={messageField.label} htmlFor={`confirm-${messageField.name}`} required={messageField.required}>
              <Textarea
                id={`confirm-${messageField.name}`}
                name={messageField.name}
                required={messageField.required}
                placeholder={messageField.placeholder}
                maxLength={1000}
                rows={3}
              />
            </Field>
          )}
          {state.error && <FormMessage state={state} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
