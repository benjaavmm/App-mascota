import { z } from "zod";

import { isValidCommune } from "@/lib/chile";
import { Constants } from "@/types/database";

z.config(z.locales.es());

const E = Constants.public.Enums;

// ---------------------------------------------------------------------------
// Utilidades para leer FormData
// ---------------------------------------------------------------------------
export function formObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) out[key] = value;
  }
  return out;
}

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  message?: string;
  values?: Record<string, string>;
};

export function validationError(error: z.ZodError, values?: Record<string, string>): ActionState {
  return {
    error: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as FieldErrors,
    values,
  };
}

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} es obligatorio.` })
    .trim()
    .min(min, { error: min <= 1 ? `${label} es obligatorio.` : `${label}: mínimo ${min} caracteres.` })
    .max(max, { error: `${label}: máximo ${max} caracteres.` });

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label}: máximo ${max} caracteres.` })
    .optional()
    .transform((v) => (v ? v : null));

// Un checkbox desmarcado no se envía en el formulario: por eso es opcional.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const requiredCheckbox = (message: string) =>
  z.union([z.literal("on"), z.literal("true")], { error: message }).transform(() => true);

// "si" | "no" | "" → true | false | null
const triState = z
  .enum(["si", "no", ""])
  .optional()
  .transform((v) => (v === "si" ? true : v === "no" ? false : null));

const commune = z
  .string({ error: "Elige una comuna." })
  .refine(isValidCommune, { error: "Elige una comuna." });

const password = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres." })
  .max(72, { error: "La contraseña es demasiado larga." })
  .regex(/[A-Za-z]/, { error: "La contraseña debe incluir letras." })
  .regex(/\d/, { error: "La contraseña debe incluir números." });

const phone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/[^\d+ ]/g, "").replace(/\s+/g, " ") : null))
  .refine((v) => v === null || /^\+?[0-9][0-9 ]{7,15}$/.test(v), {
    error: "Teléfono no válido. Ejemplo: +56 9 1234 5678",
  });

const displayName = text(2, 60, "El nombre");

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------
export const signInSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
});

export const signUpSchema = z
  .object({
    display_name: displayName,
    email: z.email({ error: "Ingresa un correo válido." }).trim().toLowerCase(),
    password,
    password_confirm: z.string(),
    accept_terms: requiredCheckbox("Debes aceptar los términos y la política de privacidad."),
    confirm_adult: requiredCheckbox("Debes ser mayor de 18 años para usar AyudaPatitas."),
  })
  .refine((d) => d.password === d.password_confirm, {
    path: ["password_confirm"],
    error: "Las contraseñas no coinciden.",
  });

export const emailSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }).trim().toLowerCase(),
});

export const newPasswordSchema = z
  .object({ password, password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, {
    path: ["password_confirm"],
    error: "Las contraseñas no coinciden.",
  });

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------
export const onboardingSchema = z.object({
  display_name: displayName,
  account_type: z.enum(E.account_type, { error: "Elige un tipo de cuenta." }),
  commune_code: commune,
  phone,
  accept_terms: requiredCheckbox("Debes aceptar los términos y la política de privacidad."),
  confirm_adult: requiredCheckbox("Debes ser mayor de 18 años para usar AyudaPatitas."),
});

export const profileSchema = z.object({
  display_name: displayName,
  bio: optionalText(600, "La presentación"),
  account_type: z.enum(E.account_type, { error: "Elige un tipo de cuenta." }),
  commune_code: commune,
  phone,
  website_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v) && v.length <= 200), {
      error: "Ingresa un sitio web válido que comience con https://",
    }),
  instagram: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      v
        ? v
            .replace(/^@/, "")
            .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
            .replace(/\/$/, "")
        : null,
    )
    .refine((v) => v === null || /^[A-Za-z0-9._]{1,30}$/.test(v), {
      error: "Usuario de Instagram no válido.",
    }),
});

export const verificationSchema = z.object({
  requested_type: z.enum(["rescuer", "shelter"], { error: "Elige el tipo de verificación." }),
  organization_name: optionalText(120, "El nombre de la organización"),
  description: text(30, 2000, "La descripción"),
  social_links: optionalText(500, "Los enlaces"),
});

// ---------------------------------------------------------------------------
// Publicaciones
// ---------------------------------------------------------------------------
export const petSchema = z
  .object({
    kind: z.enum(E.listing_kind, { error: "Elige el tipo de publicación." }),
    species: z.enum(E.species, { error: "Elige la especie." }),
    name: text(1, 40, "El nombre"),
    sex: z.enum(E.pet_sex, { error: "Elige el sexo." }),
    size: z.enum(E.pet_size, { error: "Elige el tamaño." }),
    age_unknown: checkbox,
    age_years: z.coerce.number().int().min(0).max(60).optional().default(0),
    age_months: z.coerce.number().int().min(0).max(11).optional().default(0),
    breed: text(1, 60, "La raza"),
    color: optionalText(60, "El color"),
    weight_kg: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v.replace(",", ".")) : null))
      .refine((v) => v === null || (Number.isFinite(v) && v >= 0.01 && v <= 1500), {
        error: "Peso no válido (entre 0,01 y 1.500 kg).",
      }),
    description: text(30, 3000, "La descripción"),
    energy: z
      .enum([...E.energy_level, ""])
      .optional()
      .transform((v) => (v ? (v as (typeof E.energy_level)[number]) : null)),
    good_with_kids: triState,
    good_with_dogs: triState,
    good_with_cats: triState,
    vaccinated: checkbox,
    dewormed: checkbox,
    sterilized: checkbox,
    microchipped: checkbox,
    special_needs: checkbox,
    health_notes: optionalText(1500, "Las notas de salud"),
    requirements: optionalText(1500, "Los requisitos"),
    commune_code: commune,
    location_hint: optionalText(120, "La referencia"),
    event_date: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "Fecha no válida." }),
    is_urgent: checkbox,
  })
  .refine((d) => d.kind === "adoption" || d.event_date !== null, {
    path: ["event_date"],
    error: "Indica la fecha en que se perdió o se encontró.",
  });

export type PetInput = z.infer<typeof petSchema>;

// ---------------------------------------------------------------------------
// Solicitudes de adopción
// ---------------------------------------------------------------------------
export const applicationSchema = z
  .object({
    housing_type: z.enum(E.housing_type, { error: "Elige el tipo de vivienda." }),
    housing_tenure: z.enum(E.housing_tenure, { error: "Indica si es propia o arrendada." }),
    landlord_allows_pets: triState,
    has_secure_yard: z
      .enum(["si", "no"], { error: "Indica si tienes patio cerrado." })
      .transform((v) => v === "si"),
    adults_count: z.coerce
      .number({ error: "Indica cuántos adultos viven en tu hogar." })
      .int()
      .min(1, { error: "Debe haber al menos 1 adulto." })
      .max(20),
    children_count: z.coerce.number().int().min(0).max(20).default(0),
    children_ages: optionalText(100, "Las edades"),
    household_agrees: requiredCheckbox(
      "Todas las personas de tu hogar deben estar de acuerdo con la adopción.",
    ),
    other_pets: optionalText(600, "La descripción de otras mascotas"),
    hours_alone: z.coerce
      .number({ error: "Indica cuántas horas estaría solo." })
      .int()
      .min(0)
      .max(24, { error: "Máximo 24 horas." }),
    experience: text(10, 1500, "Tu experiencia"),
    motivation: text(50, 2000, "Tu motivación"),
    care_plan: text(20, 1500, "Tu plan de cuidados"),
    commits_vet_care: requiredCheckbox("Este compromiso es obligatorio."),
    commits_sterilization: requiredCheckbox("Este compromiso es obligatorio."),
    accepts_followup: requiredCheckbox("Este compromiso es obligatorio."),
    commits_return_not_abandon: requiredCheckbox("Este compromiso es obligatorio."),
  })
  .refine((d) => d.housing_tenure !== "rented" || d.landlord_allows_pets !== null, {
    path: ["landlord_allows_pets"],
    error: "Indica si tu contrato de arriendo permite mascotas.",
  });

export const decisionSchema = z.object({
  status: z.enum(["reviewing", "approved", "rejected", "cancelled"]),
  message: optionalText(1000, "El mensaje"),
});

// ---------------------------------------------------------------------------
// Seguridad
// ---------------------------------------------------------------------------
export const reportSchema = z.object({
  target_type: z.enum(["pet", "user", "message"]),
  target_id: z.uuid(),
  reason: z.enum(E.report_reason, { error: "Elige un motivo." }),
  details: optionalText(2000, "El detalle"),
});

export const followupSchema = z.object({
  wellbeing: z.coerce
    .number({ error: "Indica cómo está." })
    .int()
    .min(1, { error: "Indica cómo está." })
    .max(5),
  notes: text(10, 2000, "Tu relato"),
});
