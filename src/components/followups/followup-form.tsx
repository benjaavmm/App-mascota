"use client";

/* eslint-disable @next/next/no-img-element -- vista previa local */
import { ImagePlus, Loader2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import { commentFollowup, submitFollowup } from "@/actions/applications";
import { Alert, FormMessage } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { ChoiceGroup, Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { WELLBEING_LABELS } from "@/lib/constants";
import { uploadPrivateImage } from "@/lib/upload";
import type { ActionState } from "@/lib/validation";

export function FollowupForm({ followupId, userId, petName }: { followupId: string; userId: string; petName: string }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const [state, dispatch] = useActionState<ActionState, FormData>(async (prev, formData) => {
    let path: string | null = null;
    if (photo) {
      try {
        path = await uploadPrivateImage("followup-photos", `${userId}/${followupId}`, photo);
      } catch (error) {
        return { error: error instanceof Error ? error.message : "No pudimos subir la foto." };
      }
    }
    return submitFollowup(followupId, path, prev, formData);
  }, {});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  if (state.ok) return <Alert variant="success">{state.message}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ChoiceGroup
        legend={`¿Cómo está ${petName}?`}
        name="wellbeing"
        required
        errors={state.fieldErrors?.wellbeing}
        defaultValue={state.values?.wellbeing}
        options={Object.entries(WELLBEING_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <Field
        label="Cuéntanos cómo ha sido"
        htmlFor="notes"
        required
        errors={state.fieldErrors?.notes}
        hint="Alimentación, salud, paseos, cómo se lleva con la familia, visitas al veterinario…"
      >
        <Textarea id="notes" name="notes" required minLength={10} maxLength={2000} rows={5} defaultValue={state.values?.notes} />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-800">Foto (opcional)</p>
        {preview ? (
          <div className="relative inline-block">
            <img src={preview} alt="Foto del seguimiento" className="h-40 rounded-2xl object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 rounded-full bg-white/90 p-1 text-stone-700"
              aria-label="Quitar foto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className={buttonClasses({ variant: "secondary" })}>
            <ImagePlus className="h-4 w-4" />
            Agregar foto
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
        />
        <p className="mt-1.5 text-xs text-stone-500">Solo la verá quien te entregó a {petName}. Le quitamos la ubicación GPS.</p>
      </div>
      <FormMessage state={state.fieldErrors ? null : state} />
      <button type="submit" disabled={pending} className={buttonClasses({ size: "lg" })}>
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        {pending ? "Enviando…" : "Enviar seguimiento"}
      </button>
    </form>
  );
}

export function FollowupCommentForm({ followupId }: { followupId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(commentFollowup, {});
  if (state.ok) return <Alert variant="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="followup_id" value={followupId} />
      <Field label="Responder a quien adoptó" htmlFor="comment">
        <Textarea id="comment" name="comment" required maxLength={1000} rows={3} placeholder="¡Qué alegría verle tan bien!" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Enviar comentario</SubmitButton>
    </form>
  );
}
