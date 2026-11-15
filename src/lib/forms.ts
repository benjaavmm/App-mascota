// Formulario de adopción propio de cada publicador (ver la migración 000900_custom_forms).

export type QuestionKind = "short" | "long" | "yesno" | "choice";

export type FormQuestion = {
  id?: string;
  label: string;
  kind: QuestionKind;
  options: string[] | null;
  required: boolean;
};

export type AdoptionFormConfig = {
  externalUrl: string | null;
  intro: string | null;
  questions: (FormQuestion & { id: string })[];
};

export const MAX_QUESTIONS = 10;

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  short: "Respuesta corta",
  long: "Respuesta larga",
  yesno: "Sí o no",
  choice: "Elegir una opción",
};

// Mismos servicios que acepta la base de datos (evita enlaces engañosos).
export const FORM_URL_PATTERN =
  /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/|forms\.office\.com\/|forms\.microsoft\.com\/|([a-z0-9-]+\.)?typeform\.com\/|(form\.)?jotform\.com\/|tally\.so\/)[^\s<>"']*$/;

export const FORM_SERVICES = "Google Forms, Microsoft Forms, Typeform, Jotform o Tally";

export function formHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isAnswerList(value: unknown): value is { question: string; answer: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (a) => a && typeof a === "object" && typeof a.question === "string" && typeof a.answer === "string",
    )
  );
}
