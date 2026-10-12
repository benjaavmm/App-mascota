import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { RegionCommuneSelect } from "@/components/pets/region-commune-select";
import { buttonClasses } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { AGE_GROUPS, SEX_LABELS, SIZE_SHORT } from "@/lib/constants";

export type PetFilterValues = {
  tipo: string;
  q?: string;
  region?: string;
  comuna?: string;
  tamano?: string;
  sexo?: string;
  edad?: string;
  esterilizado?: boolean;
  ninos?: boolean;
  perros?: boolean;
  gatos?: boolean;
  urgente?: boolean;
  orden?: string;
};

export function countActiveFilters(f: PetFilterValues) {
  return [f.q, f.region, f.comuna, f.tamano, f.sexo, f.edad, f.esterilizado, f.ninos, f.perros, f.gatos, f.urgente].filter(
    Boolean,
  ).length;
}

export function PetFilters({ values }: { values: PetFilterValues }) {
  const isAdoption = values.tipo === "adopcion";
  const active = countActiveFilters(values);

  return (
    <CollapsiblePanel
      title="Filtros"
      icon={<SlidersHorizontal className="h-5 w-5 text-brand-600" />}
      badge={active > 0 ? <span className="rounded-full bg-brand-100 px-2 text-sm text-brand-800">{active}</span> : null}
    >
      <form method="get" action="/mascotas" className="space-y-4 p-4 lg:p-5">
        <input type="hidden" name="tipo" value={values.tipo} />
        <Field label="Buscar" htmlFor="f-q">
          <Input
            id="f-q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder={isAdoption ? "Nombre, color, carácter…" : "Color, collar, sector…"}
            maxLength={80}
          />
        </Field>
        <RegionCommuneSelect
          idPrefix="f"
          regionName="region"
          communeName="comuna"
          defaultRegion={values.region}
          defaultCommune={values.comuna}
          allowAll
          compact
        />
        <Field label="Tamaño" htmlFor="f-size">
          <Select id="f-size" name="tamano" defaultValue={values.tamano ?? ""}>
            <option value="">Todos</option>
            {Object.entries(SIZE_SHORT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sexo" htmlFor="f-sex">
          <Select id="f-sex" name="sexo" defaultValue={values.sexo ?? ""}>
            <option value="">Todos</option>
            <option value="female">{SEX_LABELS.female}</option>
            <option value="male">{SEX_LABELS.male}</option>
          </Select>
        </Field>
        {isAdoption && (
          <>
            <Field label="Edad" htmlFor="f-age">
              <Select id="f-age" name="edad" defaultValue={values.edad ?? ""}>
                <option value="">Todas</option>
                {Object.entries(AGE_GROUPS).map(([value, group]) => (
                  <option key={value} value={value}>
                    {group.label}
                  </option>
                ))}
              </Select>
            </Field>
            <fieldset className="space-y-2.5">
              <legend className="mb-1.5 text-sm font-bold text-stone-800">Características</legend>
              <Checkbox id="f-ster" name="esterilizado" value="1" label="Esterilizado" defaultChecked={values.esterilizado} />
              <Checkbox id="f-kids" name="ninos" value="1" label="Se lleva bien con niños" defaultChecked={values.ninos} />
              <Checkbox id="f-pets" name="perros" value="1" label="Se lleva bien con perros" defaultChecked={values.perros} />
              <Checkbox id="f-cats" name="gatos" value="1" label="Se lleva bien con gatos" defaultChecked={values.gatos} />
              <Checkbox id="f-urgent" name="urgente" value="1" label="Solo casos urgentes" defaultChecked={values.urgente} />
            </fieldset>
          </>
        )}
        <Field label="Ordenar por" htmlFor="f-order">
          <Select id="f-order" name="orden" defaultValue={values.orden ?? "recientes"}>
            <option value="recientes">Más recientes</option>
            {isAdoption && <option value="urgentes">Urgentes primero</option>}
            <option value="antiguos">Más antiguos</option>
          </Select>
        </Field>
        <div className="flex gap-2 pt-1">
          <button type="submit" className={buttonClasses({ className: "flex-1" })}>
            Aplicar filtros
          </button>
          {active > 0 && (
            <Link href={`/mascotas?tipo=${values.tipo}`} className={buttonClasses({ variant: "ghost" })}>
              Limpiar
            </Link>
          )}
        </div>
      </form>
    </CollapsiblePanel>
  );
}
