"use client";

import { ArrowDown, ArrowUp, ClipboardList, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";

import { saveAdoptionForm } from "@/actions/forms";
import { Alert, FormMessage } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, FieldError, Input, Select, Textarea } from "@/components/ui/field";
import {
  FORM_SERVICES,
  MAX_QUESTIONS,
  QUESTION_KIND_LABELS,
  type AdoptionFormConfig,
  type QuestionKind,
} from "@/lib/forms";
import { cn } from "@/lib/utils";

type Draft = { key: number; label: string; kind: QuestionKind; optionsText: string; required: boolean };

const BASE_QUESTIONS = [
  "Tipo de vivienda, si es propia o arrendada y si el arriendo permite mascotas",
  "Si tiene patio o terraza cerrada",
  "Cuántas personas viven en el hogar y si todas están de acuerdo",
  "Otras mascotas y cuántas horas al día estaría sola",
  "Experiencia, motivación y plan ante vacaciones o cambios",
  "Compromisos de adopción responsable (veterinario, esterilización, seguimientos y no abandono)",
];

export function AdoptionFormEditor({ initial }: { initial: AdoptionFormConfig }) {
  const [state, dispatch] = useActionState(saveAdoptionForm, {});
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"app" | "external">(initial.externalUrl ? "external" : "app");
  const nextKey = useRef(initial.questions.length);
  const [questions, setQuestions] = useState<Draft[]>(
    initial.questions.map((q, i) => ({
      key: i,
      label: q.label,
      kind: q.kind,
      optionsText: (q.options ?? []).join("\n"),
      required: q.required,
    })),
  );
  const errors = state.fieldErrors ?? {};

  const update = (key: number, patch: Partial<Draft>) =>
    setQuestions((list) => list.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  const move = (index: number, delta: number) =>
    setQuestions((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  const add = () =>
    setQuestions((list) => [
      ...list,
      { key: nextKey.current++, label: "", kind: "short", optionsText: "", required: true },
    ]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "questions",
      JSON.stringify(
        questions.map((q) => ({
          label: q.label,
          kind: q.kind,
          required: q.required,
          options:
            q.kind === "choice"
              ? q.optionsText
                  .split("\n")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : null,
        })),
      ),
    );
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">¿Cómo quieres recibir las postulaciones?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              [
                "app",
                "Cuestionario de AyudaPatitas",
                "Preguntas sobre hogar, familia y experiencia. Puedes sumar tus propias preguntas.",
                ClipboardList,
              ],
              [
                "external",
                "Mi propio formulario",
                `${FORM_SERVICES}. Quien postula lo completa allá.`,
                ExternalLink,
              ],
            ] as const
          ).map(([value, title, text, Icon]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition",
                mode === value ? "border-brand-500 bg-brand-50" : "border-stone-200 hover:border-stone-300",
              )}
            >
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
              />
              <span>
                <span className="flex items-center gap-1.5 font-extrabold text-stone-900">
                  <Icon className="h-4 w-4 text-brand-600" />
                  {title}
                </span>
                <span className="mt-1 block text-sm text-stone-600">{text}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {mode === "external" ? (
        <Card className="space-y-4 p-5 sm:p-6">
          <Field
            label="Enlace de tu formulario"
            htmlFor="external_url"
            required
            errors={errors.external_url}
            hint="En Google Forms: abre tu formulario, toca «Enviar», elige el ícono de enlace 🔗 y copia."
          >
            <Input
              id="external_url"
              name="external_url"
              type="url"
              inputMode="url"
              placeholder="https://forms.gle/…"
              defaultValue={state.values?.external_url ?? initial.externalUrl ?? ""}
              invalid={Boolean(errors.external_url)}
            />
          </Field>
          <Alert variant="info">
            Quien postula abre tu formulario y luego confirma aquí que lo envió. Igual acepta los compromisos
            de adopción responsable, y el chat seguro, el acta de adopción y los seguimientos funcionan como
            siempre.
          </Alert>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Tus preguntas (opcional)</h2>
          <p className="mt-1 text-sm text-stone-600">
            Se agregan al final del cuestionario de AyudaPatitas. Máximo {MAX_QUESTIONS}.
          </p>
          <details className="mt-3 rounded-2xl bg-stone-50 p-4 text-sm">
            <summary className="cursor-pointer font-bold text-stone-800">
              Ver lo que ya pregunta AyudaPatitas
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600">
              {BASE_QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </details>

          <ol className="mt-5 space-y-4">
            {questions.map((q, i) => (
              <li key={q.key} className="rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-brand-700">Pregunta {i + 1}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Subir pregunta ${i + 1}`}
                      className={buttonClasses({ variant: "ghost", size: "icon" })}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === questions.length - 1}
                      aria-label={`Bajar pregunta ${i + 1}`}
                      className={buttonClasses({ variant: "ghost", size: "icon" })}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestions((list) => list.filter((x) => x.key !== q.key))}
                      aria-label={`Eliminar pregunta ${i + 1}`}
                      className={buttonClasses({
                        variant: "ghost",
                        size: "icon",
                        className: "text-rose-600",
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  <Input
                    aria-label={`Texto de la pregunta ${i + 1}`}
                    value={q.label}
                    maxLength={200}
                    placeholder="Ej: ¿Tienes mallas de protección en las ventanas?"
                    onChange={(e) => update(q.key, { label: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      aria-label={`Tipo de respuesta de la pregunta ${i + 1}`}
                      value={q.kind}
                      onChange={(e) => update(q.key, { kind: e.target.value as QuestionKind })}
                      className="w-auto"
                    >
                      {Object.entries(QUESTION_KIND_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Checkbox
                      id={`required-${q.key}`}
                      label="Obligatoria"
                      checked={q.required}
                      onChange={(e) => update(q.key, { required: e.target.checked })}
                    />
                  </div>
                  {q.kind === "choice" && (
                    <Field label="Opciones (una por línea, de 2 a 8)" htmlFor={`options-${q.key}`}>
                      <Textarea
                        id={`options-${q.key}`}
                        rows={3}
                        value={q.optionsText}
                        placeholder={"Casa\nDepartamento\nParcela"}
                        onChange={(e) => update(q.key, { optionsText: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <FieldError errors={errors.questions} />
          <button
            type="button"
            onClick={add}
            disabled={questions.length >= MAX_QUESTIONS}
            className={buttonClasses({ variant: "secondary", className: "mt-4" })}
          >
            <Plus className="h-4 w-4" />
            Agregar pregunta
          </button>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <Field
          label="Mensaje para quienes postulan (opcional)"
          htmlFor="intro"
          errors={errors.intro}
          hint="Ej: «Solo entregamos en la Región Metropolitana» o «Respondemos en 3 días hábiles»."
        >
          <Textarea
            id="intro"
            name="intro"
            rows={3}
            maxLength={600}
            defaultValue={state.values?.intro ?? initial.intro ?? ""}
          />
        </Field>
      </Card>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          {pending ? "Guardando…" : "Guardar formulario"}
        </button>
      </div>
    </form>
  );
}
