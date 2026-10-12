"use client";

import { Camera, FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";

import {
  changePassword,
  deleteAccount,
  requestVerification,
  updateAvatar,
  updateProfile,
} from "@/actions/profile";
import { PasswordInput } from "@/components/auth/password-input";
import { RegionCommuneSelect } from "@/components/dogs/region-commune-select";
import { Alert, FormMessage } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { ChoiceGroup, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { prepareImage, randomFileName } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateImage } from "@/lib/upload";
import type { ActionState } from "@/lib/validation";

export function AvatarUploader({
  userId,
  name,
  path,
}: {
  userId: string;
  name: string;
  path: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await prepareImage(file, { maxSide: 512, quality: 0.85 });
      const newPath = `${userId}/${randomFileName()}`;
      const { error: uploadError } = await createClient()
        .storage.from("avatars")
        .upload(newPath, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadError) throw new Error("No pudimos subir la foto.");
      const result = await updateAvatar(newPath);
      if (result.error) throw new Error(result.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir la foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} path={path} size="lg" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="absolute -right-1 -bottom-1 rounded-full bg-brand-600 p-2 text-white shadow-md hover:bg-brand-700"
          aria-label="Cambiar foto de perfil"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {path && (
        <button
          type="button"
          disabled={busy}
          className="text-sm font-semibold text-stone-500 hover:text-rose-600"
          onClick={async () => {
            setBusy(true);
            await updateAvatar(null);
            setBusy(false);
            router.refresh();
          }}
        >
          Quitar foto
        </button>
      )}
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

type ProfileDefaults = {
  display_name: string;
  bio: string | null;
  account_type: string;
  commune_code: string | null;
  phone: string | null;
  website_url: string | null;
  instagram: string | null;
};

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, dispatch] = useActionState<ActionState, FormData>(updateProfile, {});
  const [pending, startTransition] = useTransition();
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Nombre visible" htmlFor="display_name" required errors={errors.display_name}>
        <Input
          id="display_name"
          name="display_name"
          required
          maxLength={60}
          defaultValue={v.display_name ?? defaults.display_name}
        />
      </Field>
      <Field
        label="Presentación"
        htmlFor="bio"
        errors={errors.bio}
        hint="Cuéntale a la comunidad quién eres. No incluyas teléfono ni dirección."
      >
        <Textarea id="bio" name="bio" maxLength={600} rows={3} defaultValue={v.bio ?? defaults.bio ?? ""} />
      </Field>
      <ChoiceGroup
        legend="Tipo de cuenta"
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
        label="Teléfono (privado)"
        htmlFor="phone"
        errors={errors.phone}
        hint="Solo lo verán las personas con quienes decidas compartir tu contacto."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+56 9 1234 5678"
          defaultValue={v.phone ?? defaults.phone ?? ""}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Sitio web (opcional)" htmlFor="website_url" errors={errors.website_url}>
          <Input
            id="website_url"
            name="website_url"
            type="url"
            placeholder="https://"
            defaultValue={v.website_url ?? defaults.website_url ?? ""}
          />
        </Field>
        <Field label="Instagram (opcional)" htmlFor="instagram" errors={errors.instagram}>
          <Input
            id="instagram"
            name="instagram"
            placeholder="@usuario"
            defaultValue={v.instagram ?? defaults.instagram ?? ""}
          />
        </Field>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={buttonClasses()}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}

export function VerificationForm({ userId, defaultType }: { userId: string; defaultType: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useActionState<ActionState, FormData>(async (prev, formData) => {
    if (file) {
      try {
        const path = await uploadPrivateImage("verification-docs", userId, file);
        formData.set("document_path", path);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "No pudimos subir el documento." };
      }
    }
    return requestVerification(prev, formData);
  }, {});
  const errors = state.fieldErrors ?? {};

  if (state.ok) return <Alert variant="success">{state.message}</Alert>;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Quiero verificarme como" htmlFor="requested_type" required errors={errors.requested_type}>
        <Select
          id="requested_type"
          name="requested_type"
          defaultValue={defaultType === "shelter" ? "shelter" : "rescuer"}
        >
          <option value="rescuer">{ACCOUNT_TYPE_LABELS.rescuer}</option>
          <option value="shelter">{ACCOUNT_TYPE_LABELS.shelter}</option>
        </Select>
      </Field>
      <Field
        label="Nombre de la organización (si aplica)"
        htmlFor="organization_name"
        errors={errors.organization_name}
      >
        <Input id="organization_name" name="organization_name" maxLength={120} />
      </Field>
      <Field
        label="Cuéntanos sobre tu labor"
        htmlFor="description"
        required
        errors={errors.description}
        hint="Desde cuándo rescatas, en qué comunas, cuántos perritos has dado en adopción, con quién trabajas…"
      >
        <Textarea id="description" name="description" required minLength={30} maxLength={2000} rows={4} />
      </Field>
      <Field
        label="Redes sociales o enlaces"
        htmlFor="social_links"
        errors={errors.social_links}
        hint="Instagram, Facebook, sitio web, notas de prensa."
      >
        <Textarea id="social_links" name="social_links" maxLength={500} rows={2} />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-800">Documento de respaldo (opcional)</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <FileUp className="h-4 w-4" />
          {file ? file.name : "Adjuntar PDF o imagen"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="mt-1.5 text-xs text-stone-500">
          Por ejemplo, certificado de personalidad jurídica. Es privado: solo lo ve el equipo de moderación.
        </p>
      </div>
      <FormMessage state={state.fieldErrors ? null : state} />
      <button type="submit" disabled={pending} className={buttonClasses()}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar solicitud
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Contraseña actual" htmlFor="current-password">
        <PasswordInput
          id="current-password"
          name="current_password"
          autoComplete="current-password"
          required
          className="max-w-sm"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña" htmlFor="new-password" errors={state.fieldErrors?.password}>
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <Field
          label="Repite la contraseña"
          htmlFor="new-password-confirm"
          errors={state.fieldErrors?.password_confirm}
        >
          <PasswordInput
            id="new-password-confirm"
            name="password_confirm"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>
      <FormMessage state={state.fieldErrors ? null : state} />
      <SubmitButton variant="secondary" pendingText="Guardando…">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<ActionState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Escribe ELIMINAR para confirmar" htmlFor="confirm-delete">
          <Input id="confirm-delete" name="confirm" autoComplete="off" />
        </Field>
        <Field label="Tu contraseña" htmlFor="delete-password">
          <PasswordInput id="delete-password" name="password" autoComplete="current-password" required />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingText="Eliminando…">
        Eliminar mi cuenta para siempre
      </SubmitButton>
    </form>
  );
}
