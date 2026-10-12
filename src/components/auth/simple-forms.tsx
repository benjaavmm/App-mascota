"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, updatePassword } from "@/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, FormMessage } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export function ResetRequestForm() {
  const [state, action] = useActionState<ActionState, FormData>(requestPasswordReset, {});
  if (state.ok) return <Alert variant="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo electrónico" htmlFor="email" errors={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={state.fieldErrors ? null : state} />
      <SubmitButton size="lg" className="w-full" pendingText="Enviando…">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(updatePassword, {});
  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert variant="success">{state.message}</Alert>
        <Link href="/" className={buttonClasses({ size: "lg", className: "w-full" })}>
          Ir al inicio
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Nueva contraseña" htmlFor="password" errors={state.fieldErrors?.password} hint="Mínimo 8 caracteres, con letras y números.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Repite la contraseña" htmlFor="password_confirm" errors={state.fieldErrors?.password_confirm}>
        <PasswordInput id="password_confirm" name="password_confirm" autoComplete="new-password" required />
      </Field>
      <FormMessage state={state.fieldErrors ? null : state} />
      <SubmitButton size="lg" className="w-full" pendingText="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
