"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Alert, FormMessage } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, ChoiceGroup, Field, FieldError, Input, Textarea } from "@/components/ui/field";
import { HOUSING_TENURE_LABELS, HOUSING_TYPE_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/validation";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  );
}

export function ApplicationForm({
  petName,
  action,
}: {
  petName: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, dispatch] = useActionState(action, {});
  const [pending, startTransition] = useTransition();
  const [tenure, setTenure] = useState("");
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="Tu hogar">
        <ChoiceGroup
          legend="Tipo de vivienda"
          name="housing_type"
          required
          errors={errors.housing_type}
          defaultValue={v.housing_type}
          options={Object.entries(HOUSING_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <div
          onChange={(event) => {
            const target = event.target as HTMLInputElement;
            if (target.name === "housing_tenure") setTenure(target.value);
          }}
        >
          <ChoiceGroup
            legend="La vivienda es"
            name="housing_tenure"
            required
            errors={errors.housing_tenure}
            defaultValue={v.housing_tenure}
            options={Object.entries(HOUSING_TENURE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
        {(tenure || v.housing_tenure) === "rented" && (
          <ChoiceGroup
            legend="¿Tu contrato de arriendo o administración permite mascotas?"
            name="landlord_allows_pets"
            required
            errors={errors.landlord_allows_pets}
            defaultValue={v.landlord_allows_pets}
            options={[
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
            ]}
          />
        )}
        <ChoiceGroup
          legend="¿Tienes patio o terraza cerrada y segura?"
          name="has_secure_yard"
          required
          errors={errors.has_secure_yard}
          defaultValue={v.has_secure_yard}
          options={[
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ]}
        />
      </Section>

      <Section title="Tu familia">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Adultos en el hogar" htmlFor="adults_count" required errors={errors.adults_count}>
            <Input
              id="adults_count"
              name="adults_count"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={v.adults_count ?? "1"}
            />
          </Field>
          <Field label="Niños o niñas en el hogar" htmlFor="children_count" errors={errors.children_count}>
            <Input
              id="children_count"
              name="children_count"
              type="number"
              min={0}
              max={20}
              defaultValue={v.children_count ?? "0"}
            />
          </Field>
        </div>
        <Field label="Edades de los niños (si hay)" htmlFor="children_ages" errors={errors.children_ages}>
          <Input
            id="children_ages"
            name="children_ages"
            maxLength={100}
            placeholder="Ej: 4 y 9 años"
            defaultValue={v.children_ages ?? ""}
          />
        </Field>
        <Checkbox
          id="household_agrees"
          name="household_agrees"
          required
          label="Todas las personas con las que vivo están de acuerdo con adoptar"
          defaultChecked={v.household_agrees === "on"}
        />
        <FieldError errors={errors.household_agrees} />
      </Section>

      <Section title="Rutina y otras mascotas">
        <Field
          label="¿Tienes otras mascotas?"
          htmlFor="other_pets"
          errors={errors.other_pets}
          hint="Cuéntanos especie, edad, si están esterilizadas y cómo se llevan con otros animales."
        >
          <Textarea
            id="other_pets"
            name="other_pets"
            maxLength={600}
            rows={3}
            defaultValue={v.other_pets ?? ""}
          />
        </Field>
        <Field
          label={`¿Cuántas horas al día estaría solo/a ${petName}?`}
          htmlFor="hours_alone"
          required
          errors={errors.hours_alone}
        >
          <Input
            id="hours_alone"
            name="hours_alone"
            type="number"
            min={0}
            max={24}
            required
            className="max-w-32"
            defaultValue={v.hours_alone ?? ""}
          />
        </Field>
      </Section>

      <Section title="Experiencia y motivación">
        <Field
          label="¿Qué experiencia tienes cuidando animales?"
          htmlFor="experience"
          required
          errors={errors.experience}
        >
          <Textarea
            id="experience"
            name="experience"
            required
            minLength={10}
            maxLength={1500}
            rows={3}
            defaultValue={v.experience ?? ""}
          />
        </Field>
        <Field
          label={`¿Por qué quieres adoptar a ${petName}?`}
          htmlFor="motivation"
          required
          errors={errors.motivation}
          hint="Mínimo 50 caracteres. Cuéntanos sobre tu día a día y qué le ofrecerías."
        >
          <Textarea
            id="motivation"
            name="motivation"
            required
            minLength={50}
            maxLength={2000}
            rows={4}
            defaultValue={v.motivation ?? ""}
          />
        </Field>
        <Field
          label={`¿Qué pasará con ${petName} en vacaciones, mudanzas o si cambia tu situación?`}
          htmlFor="care_plan"
          required
          errors={errors.care_plan}
        >
          <Textarea
            id="care_plan"
            name="care_plan"
            required
            minLength={20}
            maxLength={1500}
            rows={3}
            defaultValue={v.care_plan ?? ""}
          />
        </Field>
      </Section>

      <Section title="Compromisos de adopción responsable">
        <p className="-mt-2 text-sm text-stone-600">
          Según la Ley 21.020 de Tenencia Responsable, quien adopta una mascota debe velar por su bienestar.
          Si es perro o gato, además debe identificarla con microchip e inscribirla en el Registro Nacional de
          Mascotas.
        </p>
        {(
          [
            [
              "commits_vet_care",
              "Me comprometo a darle atención veterinaria, alimentación adecuada y las vacunas que correspondan a su especie.",
            ],
            [
              "commits_sterilization",
              "Me comprometo a esterilizarla si corresponde a su especie y aún no lo está. Si es perro o gato, también a identificarla con microchip e inscribirla en el Registro Nacional de Mascotas.",
            ],
            [
              "accepts_followup",
              "Acepto enviar seguimientos (1 semana, 1, 3 y 6 meses) con fotos de cómo está.",
            ],
            [
              "commits_return_not_abandon",
              "Si algún día no puedo cuidarla, la devolveré a quien me la entregó. Nunca la abandonaré.",
            ],
          ] as const
        ).map(([name, label]) => (
          <div key={name}>
            <Checkbox id={name} name={name} required label={label} defaultChecked={v[name] === "on"} />
            <FieldError errors={errors[name]} />
          </div>
        ))}
      </Section>

      <Alert variant="info">
        Solo quien publicó a {petName} verá tus respuestas. Tu teléfono y correo no se comparten
        automáticamente.
      </Alert>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          {pending ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}
