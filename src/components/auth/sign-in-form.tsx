"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { FormMessage } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<ActionState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Correo electrónico" htmlFor="email" errors={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          invalid={!!state.fieldErrors?.email}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password" errors={state.fieldErrors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right">
        <Link href="/recuperar" className="text-sm font-semibold text-brand-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}
