"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition, type FormEvent } from "react";

import { createPet, type CreatePetState } from "@/actions/pets";
import { PhotoPicker } from "@/components/pets/photo-picker";
import { RegionCommuneSelect } from "@/components/pets/region-commune-select";
import { Alert, FormMessage } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ENERGY_LABELS, KIND_LABELS, SEX_LABELS, SIZE_LABELS } from "@/lib/constants";
import { ageInMonths, todayIso } from "@/lib/format";
import { personalDataWarning } from "@/lib/safety";
import { uploadPetPhotos } from "@/lib/upload";
import type { ActionState } from "@/lib/validation";
import type { Enums, Tables } from "@/types/database";

type Kind = Enums<"listing_kind">;

export type EditablePet = Pick<
  Tables<"pets">,
  | "id"
  | "kind"
  | "name"
  | "sex"
  | "size"
  | "birth_date_estimate"
  | "breed"
  | "color"
  | "weight_kg"
  | "description"
  | "energy"
  | "good_with_kids"
  | "good_with_dogs"
  | "good_with_cats"
  | "vaccinated"
  | "dewormed"
  | "sterilized"
  | "microchipped"
  | "special_needs"
  | "health_notes"
  | "requirements"
  | "commune_code"
  | "location_hint"
  | "event_date"
  | "is_urgent"
>;

const tri = (value: boolean | null | undefined) => (value === true ? "si" : value === false ? "no" : "");

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  );
}

type Props =
  | { mode: "create"; userId: string; defaultKind: Kind; defaultCommune?: string | null }
  | {
      mode: "edit";
      pet: EditablePet;
      action: (state: ActionState, formData: FormData) => Promise<ActionState>;
    };

export function PetForm(props: Props) {
  const router = useRouter();
  const pet = props.mode === "edit" ? props.pet : null;
  const [kind, setKind] = useState<Kind>(pet?.kind ?? (props.mode === "create" ? props.defaultKind : "adoption"));
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState(pet?.description ?? "");
  const [ageUnknown, setAgeUnknown] = useState(pet ? !pet.birth_date_estimate : false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const months = ageInMonths(pet?.birth_date_estimate);
  const isAdoption = kind === "adoption";

  const [state, dispatch] = useActionState<CreatePetState, FormData>(async (previous, formData) => {
    if (props.mode === "edit") return props.action(previous, formData);

    if (files.length === 0 && !formData.get("confirm_no_photos")) {
      return { error: "Agrega al menos una foto: las publicaciones con fotos se adoptan mucho más rápido." };
    }
    const result = await createPet(previous, formData);
    if (!result.ok || !result.id) return result;

    if (files.length > 0) {
      setUploading({ done: 0, total: files.length });
      const failed = await uploadPetPhotos(props.userId, result.id, files, 0, (done) =>
        setUploading({ done, total: files.length }),
      );
      if (failed.length > 0) {
        setUploadWarning(`No pudimos subir ${failed.length} foto(s). Puedes agregarlas desde “Editar”.`);
      }
    }
    router.push(`/mascotas/${result.id}?publicado=1`);
    return result;
  }, {});

  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const dataWarning = personalDataWarning(description);
  const busy = isPending || uploading !== null;

  // Enviamos con onSubmit (y no con action=) para que React no limpie el formulario si hay errores.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {props.mode === "create" ? (
        <Section title="¿Qué quieres publicar?">
          <div
            onChange={(event) => {
              const target = event.target as HTMLInputElement;
              if (target.name === "kind") setKind(target.value as Kind);
            }}
          >
            <ChoiceGroup
              name="kind"
              defaultValue={kind}
              options={(Object.keys(KIND_LABELS) as Kind[]).map((k) => ({
                value: k,
                label: k === "adoption" ? "Dar en adopción" : k === "lost" ? "Se me perdió" : "Encontré un perrito",
              }))}
            />
          </div>
          {kind === "found" && (
            <Alert variant="info">
              Si encontraste un perrito, primero llévalo a una veterinaria o municipalidad para revisar si tiene microchip.
              Puede que su familia lo esté buscando.
            </Alert>
          )}
        </Section>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}

      <Section title="Datos básicos">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="name" required errors={errors.name} hint={kind === "found" ? "Si no lo sabes, escribe “Sin nombre”." : undefined}>
            <Input id="name" name="name" required maxLength={40} defaultValue={v.name ?? pet?.name ?? (kind === "found" ? "Sin nombre" : "")} invalid={!!errors.name} />
          </Field>
          <Field label="Raza" htmlFor="breed" required errors={errors.breed}>
            <Input id="breed" name="breed" required maxLength={60} defaultValue={v.breed ?? pet?.breed ?? "Mestizo"} />
          </Field>
        </div>
        <ChoiceGroup
          legend="Sexo"
          name="sex"
          required
          errors={errors.sex}
          defaultValue={v.sex ?? pet?.sex ?? "unknown"}
          options={Object.entries(SEX_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Field label="Tamaño" htmlFor="size" required errors={errors.size}>
          <Select id="size" name="size" required defaultValue={v.size ?? pet?.size ?? ""} invalid={!!errors.size}>
            <option value="" disabled>
              Elige un tamaño
            </option>
            {Object.entries(SIZE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-stone-800">Edad aproximada</legend>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <Field label={<span className="font-semibold text-stone-600">Años</span>} htmlFor="age_years">
              <Input
                id="age_years"
                name="age_years"
                type="number"
                min={0}
                max={25}
                inputMode="numeric"
                disabled={ageUnknown}
                defaultValue={v.age_years ?? (months !== null ? Math.floor(months / 12) : 0)}
              />
            </Field>
            <Field label={<span className="font-semibold text-stone-600">Meses</span>} htmlFor="age_months">
              <Input
                id="age_months"
                name="age_months"
                type="number"
                min={0}
                max={11}
                inputMode="numeric"
                disabled={ageUnknown}
                defaultValue={v.age_months ?? (months !== null ? months % 12 : 0)}
              />
            </Field>
          </div>
          <Checkbox
            id="age_unknown"
            name="age_unknown"
            className="mt-3"
            label="No sé su edad"
            checked={ageUnknown}
            onChange={(event) => setAgeUnknown(event.target.checked)}
          />
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Color" htmlFor="color" errors={errors.color}>
            <Input id="color" name="color" maxLength={60} placeholder="Ej: café con pecho blanco" defaultValue={v.color ?? pet?.color ?? ""} />
          </Field>
          <Field label="Peso aproximado (kg)" htmlFor="weight_kg" errors={errors.weight_kg}>
            <Input id="weight_kg" name="weight_kg" inputMode="decimal" placeholder="Ej: 12,5" defaultValue={v.weight_kg ?? (pet?.weight_kg ? String(pet.weight_kg).replace(".", ",") : "")} />
          </Field>
        </div>
        <Field
          label="Descripción"
          htmlFor="description"
          required
          errors={errors.description}
          hint={
            isAdoption
              ? "Cuenta su historia, cómo es su carácter y qué tipo de hogar necesita."
              : kind === "lost"
                ? "Describe señas particulares, collar, comportamiento y dónde se vio por última vez."
                : "Describe dónde y cómo lo encontraste, su estado y señas particulares."
          }
        >
          <Textarea
            id="description"
            name="description"
            required
            minLength={30}
            maxLength={3000}
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            invalid={!!errors.description}
          />
          <p className="mt-1 text-right text-xs text-stone-400">{description.length} / 3000</p>
        </Field>
        {dataWarning && <Alert variant="warning">{dataWarning}</Alert>}
      </Section>

      <Section title="Personalidad" description="Si no lo sabes, deja “Sin información”.">
        <Field label="Nivel de energía" htmlFor="energy">
          <Select id="energy" name="energy" defaultValue={v.energy ?? pet?.energy ?? ""}>
            <option value="">Sin información</option>
            {Object.entries(ENERGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {(
          [
            ["good_with_kids", "¿Se lleva bien con niños?", pet?.good_with_kids],
            ["good_with_dogs", "¿Se lleva bien con otros perros?", pet?.good_with_dogs],
            ["good_with_cats", "¿Se lleva bien con gatos?", pet?.good_with_cats],
          ] as const
        ).map(([name, legend, value]) => (
          <ChoiceGroup
            key={name}
            legend={legend}
            name={name}
            defaultValue={v[name] ?? tri(value)}
            options={[
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
              { value: "", label: "Sin información" },
            ]}
          />
        ))}
      </Section>

      <Section title="Salud">
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox id="vaccinated" name="vaccinated" label="Vacunas al día" defaultChecked={pet?.vaccinated} />
          <Checkbox id="dewormed" name="dewormed" label="Desparasitado" defaultChecked={pet?.dewormed} />
          <Checkbox id="sterilized" name="sterilized" label="Esterilizado" defaultChecked={pet?.sterilized} />
          <Checkbox id="microchipped" name="microchipped" label="Tiene microchip" defaultChecked={pet?.microchipped} />
          <Checkbox id="special_needs" name="special_needs" label="Tiene necesidades especiales" defaultChecked={pet?.special_needs} />
        </div>
        <Field label="Notas de salud" htmlFor="health_notes" errors={errors.health_notes} hint="Tratamientos, alergias, condiciones o cuidados especiales.">
          <Textarea id="health_notes" name="health_notes" maxLength={1500} rows={3} defaultValue={v.health_notes ?? pet?.health_notes ?? ""} />
        </Field>
      </Section>

      <Section
        title="Ubicación"
        description="Solo mostramos la comuna. Nunca publiques una dirección exacta."
      >
        <RegionCommuneSelect
          required
          errors={errors.commune_code}
          defaultCommune={v.commune_code ?? pet?.commune_code ?? (props.mode === "create" ? props.defaultCommune : null)}
        />
        {!isAdoption && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Sector de referencia" htmlFor="location_hint" errors={errors.location_hint} hint="Ej: cerca de la plaza o del metro. Sin direcciones exactas.">
              <Input id="location_hint" name="location_hint" maxLength={120} defaultValue={v.location_hint ?? pet?.location_hint ?? ""} />
            </Field>
            <Field label={kind === "lost" ? "¿Cuándo se perdió?" : "¿Cuándo lo encontraste?"} htmlFor="event_date" required errors={errors.event_date}>
              <Input id="event_date" name="event_date" type="date" required max={todayIso()} defaultValue={v.event_date ?? pet?.event_date ?? todayIso()} invalid={!!errors.event_date} />
            </Field>
          </div>
        )}
      </Section>

      {isAdoption && (
        <Section title="Requisitos para adoptar" description="Opcional. Ej: patio cerrado, compromiso de esterilización, visitas de seguimiento.">
          <Field label="Requisitos" htmlFor="requirements" errors={errors.requirements}>
            <Textarea id="requirements" name="requirements" maxLength={1500} rows={3} defaultValue={v.requirements ?? pet?.requirements ?? ""} />
          </Field>
        </Section>
      )}

      <Section title="Visibilidad">
        <Checkbox
          id="is_urgent"
          name="is_urgent"
          label="Es un caso urgente"
          description="Por ejemplo: está en la calle herido, en peligro o debe dejar el hogar temporal pronto."
          defaultChecked={pet?.is_urgent}
        />
      </Section>

      {props.mode === "create" && (
        <Section title="Fotos" description="Fotos claras, con buena luz y de cuerpo completo ayudan muchísimo.">
          <PhotoPicker files={files} onChange={setFiles} />
          {files.length === 0 && (
            <Checkbox
              id="confirm_no_photos"
              name="confirm_no_photos"
              label="Publicar sin fotos por ahora"
              description="Podrás agregarlas después desde “Mis publicaciones”."
            />
          )}
        </Section>
      )}

      {uploadWarning && <Alert variant="warning">{uploadWarning}</Alert>}
      <FormMessage state={state.ok && props.mode === "create" ? null : state} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.back()} className={buttonClasses({ variant: "ghost", size: "lg" })}>
          Cancelar
        </button>
        <button type="submit" disabled={busy} className={buttonClasses({ size: "lg" })}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {uploading
            ? `Subiendo fotos (${uploading.done}/${uploading.total})…`
            : busy
              ? "Guardando…"
              : props.mode === "create"
                ? "Publicar"
                : "Guardar cambios"}
        </button>
      </div>
      <p className="text-center text-xs text-stone-500 sm:text-right">
        Al publicar aceptas las <a href="/terminos" className="underline">normas de la comunidad</a>: está prohibido vender o cobrar por animales.
      </p>
    </form>
  );
}
