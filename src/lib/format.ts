const TIME_ZONE = "America/Santiago";

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const relativeFormatter = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

// Las columnas "date" vienen como "AAAA-MM-DD": se interpretan al mediodía para evitar desfases.
function parse(value: string | Date) {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

export function formatDate(value: string | Date | null | undefined) {
  return value ? dateFormatter.format(parse(value)) : "";
}

export function formatShortDate(value: string | Date | null | undefined) {
  return value ? shortDateFormatter.format(parse(value)) : "";
}

export function formatTime(value: string | Date) {
  return timeFormatter.format(parse(value));
}

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "";
  const diffSeconds = Math.round((parse(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return "hace un momento";
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86400), "day");
  return formatDate(value);
}

// Edad aproximada a partir de la fecha de nacimiento estimada.
export function formatAge(birthDate: string | null | undefined) {
  if (!birthDate) return "Edad desconocida";
  const birth = parse(birthDate);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months < 1) return "Menos de 1 mes";
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "año" : "años"}`;
}

export function ageInMonths(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const birth = parse(birthDate);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
}

// Fecha ISO (AAAA-MM-DD) desplazada en años/meses desde hoy, en hora de Chile.
export function isoDateFromAge(years: number, months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - (years * 12 + months));
  return toIsoDate(date);
}

export function toIsoDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Marca de tiempo ISO de hace N días (para filtros de consultas).
export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}
