"use client";

import Link from "next/link";
import { useActionState } from "react";

import { completeOnboarding } from "@/actions/profile";
import { RegionCommuneSelect } from "@/components/dogs/region-commune-select";
import { FormMessage } from "@/components/ui/alert";
import { Checkbox, ChoiceGroup, Field, FieldError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";

export function OnboardingForm({
  next,
  defaults,
}: {
  next: string;
  defaults: { display_name: string; account_type: string; commune_code: string | null; phone: string | null };
}) {
  const [state, action] = useActionState<ActionState, FormData>(completeOnboarding, {});
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field
        label="Nombre visible"
        htmlFor="display_name"
        required
        errors={errors.display_name}
        hint="Así te verán las demás personas. Puede ser tu nombre o el de tu organización."
      >
        <Input
          id="display_name"
          name="display_name"
          required
          maxLength={60}
          defaultValue={v.display_name ?? defaults.display_name}
        />
      </Field>
      <ChoiceGroup
        legend="¿Cómo usarás Huellitas?"
        name="account_type"
        required
        errors={errors.account_type}
        defaultValue={v.account_type ?? defaults.account_type}
        options={Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <RegionCommuneSelect
        required
        errors={errors.commune_code}
        defaultCommune={v.commune_code ?? defaults.commune_code}
      />
      <Field
        label="Teléfono (opcional y privado)"
        htmlFor="phone"
        errors={errors.phone}
        hint="Nunca se publica. Solo lo verá quien tú elijas al compartir tu contacto en un chat."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+56 9 1234 5678"
          defaultValue={v.phone ?? defaults.phone ?? ""}
        />
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
                términos y normas de la comunidad
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" target="_blank" className="text-brand-700 underline">
                política de privacidad
              </Link>
            </>
          }
          description="Entre otras cosas: nunca vender ni cobrar por animales, y tratar a todas las personas con respeto."
        />
        <FieldError errors={errors.accept_terms} />
        <Checkbox id="confirm_adult" name="confirm_adult" required label="Declaro ser mayor de 18 años" />
        <FieldError errors={errors.confirm_adult} />
      </div>
      <FormMessage state={state.fieldErrors ? null : state} />
      <SubmitButton size="lg" className="w-full" pendingText="Guardando…">
        Continuar
      </SubmitButton>
    </form>
  );
}
