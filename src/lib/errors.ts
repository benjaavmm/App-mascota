// Traduce errores de Supabase/Postgres a mensajes seguros para mostrar.
// Las funciones y triggers de la base de datos ya lanzan mensajes en español
// pensados para la persona usuaria; el resto se reemplaza por un texto genérico
// para no filtrar detalles internos.

type MaybePostgrestError = { code?: string; message?: string } | null | undefined;

const FRIENDLY_CODES = new Set(["23514", "23505", "23503", "54000", "42501", "P0002", "28000"]);
const INTERNAL_HINTS =
  /violates|permission denied|relation|column|syntax|function|null value|duplicate key|policy/i;

export const GENERIC_ERROR = "No pudimos completar la acción. Inténtalo nuevamente en unos minutos.";

export function friendlyError(error: MaybePostgrestError, fallback = GENERIC_ERROR) {
  if (!error?.message) return fallback;
  if (error.code && FRIENDLY_CODES.has(error.code) && !INTERNAL_HINTS.test(error.message)) {
    return error.message;
  }
  if (error.code === "23505") return "Este registro ya existe.";
  if (error.code === "42501") return "No tienes permiso para realizar esta acción.";
  return fallback;
}

// Errores de Supabase Auth.
export function friendlyAuthError(error: { message?: string; code?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "Correo o contraseña incorrectos.";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada (y spam).";
  }
  if (code === "user_already_exists" || /already registered/i.test(message)) {
    return "Ya existe una cuenta con este correo.";
  }
  if (code === "weak_password" || /password/i.test(message)) {
    return "La contraseña es muy débil: usa al menos 8 caracteres con letras y números.";
  }
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    /rate limit/i.test(message)
  ) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (code === "same_password") {
    return "La nueva contraseña debe ser distinta a la anterior.";
  }
  if (code === "reauthentication_needed") {
    return "Por seguridad, vuelve a iniciar sesión antes de cambiar tu contraseña.";
  }
  return "No pudimos completar la acción. Inténtalo nuevamente.";
}
