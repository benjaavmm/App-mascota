"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { resendConfirmation, signUp } from "@/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { FormMessage } from "@/components/ui/alert";
import { Checkbox, Field, FieldError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resendConfirmation, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="ghost" size="sm" pendingText="Enviando…">
        ¿No te llegó? Reenviar correo
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<ActionState, FormData>(signUp, {});
  const errors = state.fieldErrors ?? {};

  if (state.ok) {
    const email = state.values?.email ?? "";
    return (
      <div className="text-center">
        <MailCheck className="mx-auto h-12 w-12 text-teal-600" />
        <p className="mt-4 font-bold text-stone-800">¡Revisa tu correo!</p>
        <p className="mt-2 text-sm text-stone-600">{state.message}</p>
        <p className="mt-2 text-xs text-stone-500">Si no lo ves, busca en la carpeta de spam o promociones.</p>
        {email && <ResendForm email={email} />}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Tu nombre o el de tu organización" htmlFor="display_name" errors={errors.display_name}>
        <Input
          id="display_name"
          name="display_name"
          autoComplete="name"
          required
          maxLength={60}
          defaultValue={state.values?.display_name}
          invalid={!!errors.display_name}
        />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" errors={errors.email} hint="Nunca lo mostraremos públicamente.">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          invalid={!!errors.email}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password" errors={errors.password} hint="Mínimo 8 caracteres, con letras y números.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} invalid={!!errors.password} />
      </Field>
      <Field label="Repite la contraseña" htmlFor="password_confirm" errors={errors.password_confirm}>
        <PasswordInput id="password_confirm" name="password_confirm" autoComplete="new-password" required invalid={!!errors.password_confirm} />
      </Field>
      <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
        <Checkbox
          id="accept_terms"
          name="accept_terms"
          required
          label={
            <>
              Acepto los{" "}
              <Link href="/terminos" target="_blank" className="text-brand-700 underline">
                términos y normas
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" target="_blank" className="text-brand-700 underline">
                política de privacidad
              </Link>
            </>
          }
        />
        <FieldError errors={errors.accept_terms} />
        <Checkbox id="confirm_adult" name="confirm_adult" required label="Declaro ser mayor de 18 años" />
        <FieldError errors={errors.confirm_adult} />
      </div>
      <FormMessage state={state.error && !state.fieldErrors ? state : null} />
      <SubmitButton size="lg" className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
