"use client";

import { useState } from "react";

import { Field, Select } from "@/components/ui/field";
import { COMMUNES, REGIONS, getCommune } from "@/lib/chile";

// Selector dependiente Región → Comuna.
export function RegionCommuneSelect({
  defaultCommune,
  defaultRegion,
  communeName = "commune_code",
  regionName,
  required,
  allowAll,
  errors,
  idPrefix = "loc",
  compact,
}: {
  defaultCommune?: string | null;
  defaultRegion?: string | null;
  communeName?: string;
  // Si se indica, la región también se envía con el formulario (útil para filtros).
  regionName?: string;
  required?: boolean;
  // Permite "Todas" (para búsquedas).
  allowAll?: boolean;
  errors?: string[];
  idPrefix?: string;
  compact?: boolean;
}) {
  const initialRegion = getCommune(defaultCommune)?.regionCode ?? defaultRegion ?? "";
  const [region, setRegion] = useState(initialRegion);
  const [commune, setCommune] = useState(defaultCommune ?? "");

  const communes = region ? COMMUNES.filter((c) => c.regionCode === region) : [];

  return (
    <div className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
      <Field label="Región" htmlFor={`${idPrefix}-region`} required={required}>
        <Select
          id={`${idPrefix}-region`}
          name={regionName}
          value={region}
          required={required}
          onChange={(event) => {
            setRegion(event.target.value);
            setCommune("");
          }}
        >
          <option value="">{allowAll ? "Todas las regiones" : "Elige una región"}</option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.shortName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Comuna" htmlFor={`${idPrefix}-commune`} required={required} errors={errors}>
        <Select
          id={`${idPrefix}-commune`}
          name={communeName}
          value={commune}
          required={required}
          disabled={!region}
          invalid={Boolean(errors?.length)}
          onChange={(event) => setCommune(event.target.value)}
        >
          <option value="">{allowAll ? "Todas las comunas" : region ? "Elige una comuna" : "Primero elige región"}</option>
          {communes.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
