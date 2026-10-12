"use client";

import { useActionState } from "react";

import { createAlert } from "@/actions/alerts";
import { RegionCommuneSelect } from "@/components/pets/region-commune-select";
import { FormMessage } from "@/components/ui/alert";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SIZE_SHORT, SPECIES_PLURAL, SPECIES_SLUGS } from "@/lib/constants";

export function NewAlertForm({ defaultRegion }: { defaultRegion?: string | null }) {
  const [state, dispatch] = useActionState(createAlert, {});

  return (
    <form action={dispatch} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿Qué quieres que te avisemos?" htmlFor="alert-tipo">
          <Select id="alert-tipo" name="tipo" defaultValue="adopcion">
            <option value="adopcion">Mascotas en adopción</option>
            <option value="encontrados">Mascotas encontradas (perdí la mía)</option>
            <option value="perdidos">Mascotas perdidas (para ayudar a buscar)</option>
          </Select>
        </Field>
        <Field label="Especie" htmlFor="alert-especie">
          <Select id="alert-especie" name="especie" defaultValue="">
            <option value="">Todas las especies</option>
            {Object.entries(SPECIES_SLUGS).map(([slug, species]) => (
              <option key={slug} value={slug}>
                {species === "other" ? "Otros animales" : SPECIES_PLURAL[species]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <RegionCommuneSelect
        idPrefix="alert"
        regionName="region"
        communeName="comuna"
        allowAll
        defaultRegion={defaultRegion}
      />
      <Field label="Tamaño" htmlFor="alert-tamano">
        <Select id="alert-tamano" name="tamano" defaultValue="" className="sm:max-w-xs">
          <option value="">Cualquier tamaño</option>
          {Object.entries(SIZE_SHORT).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creando…">Crear alerta</SubmitButton>
    </form>
  );
}
