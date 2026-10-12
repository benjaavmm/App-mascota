"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { createAlert } from "@/actions/alerts";
import { FormMessage } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

// Invita a guardar la búsqueda actual como alerta.
export function CreateAlertCard({
  params,
  summary,
  signedIn,
  loginNext,
  lost,
}: {
  // tipo, especie, region, comuna y tamano de la búsqueda actual.
  params: Record<string, string>;
  summary: string;
  signedIn: boolean;
  loginNext: string;
  // En "encontrados", el texto apunta a quien perdió a su mascota.
  lost?: boolean;
}) {
  const [state, dispatch] = useActionState(createAlert, {});

  return (
    <Card className="flex flex-col gap-4 border-brand-200 bg-brand-50/60 p-5 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <BellRing className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-extrabold text-stone-900">
          {lost ? "¿Perdiste a tu mascota? Te avisamos al instante" : "¿No encuentras lo que buscas?"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Crea una alerta y te avisaremos apenas publiquen:{" "}
          <strong className="text-stone-800">{summary}</strong>.
        </p>
        {state.ok || state.error ? (
          <div className="mt-3">
            <FormMessage state={state} />
            {state.ok && (
              <Link href="/alertas" className="mt-2 inline-block text-sm font-bold text-brand-700 underline">
                Ver mis alertas
              </Link>
            )}
          </div>
        ) : null}
      </div>
      {!state.ok &&
        (signedIn ? (
          <form action={dispatch} className="shrink-0">
            {Object.entries(params).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <SubmitButton pendingText="Creando…">Crear alerta</SubmitButton>
          </form>
        ) : (
          <ButtonLink href={`/ingresar?next=${encodeURIComponent(loginNext)}`} className="shrink-0">
            Ingresa para crear una alerta
          </ButtonLink>
        ))}
    </Card>
  );
}
