// Señales de alerta en mensajes: dinero, cuentas bancarias, códigos de verificación.
// Es la misma idea que public.detect_risky_text() en la base de datos; aquí se usa
// para advertir antes de enviar.
const RISKY =
  /\b(transferenci\w*|transfier\w*|deposit\w*|cuenta ?rut|cuenta corriente|cuenta vista|numero de cuenta|pag(o|os|ar|as|ues|ue|ame)|abon(o|ar|as)|cobr(o|ar|as)|precio|vend(o|emos|er)|venta|lucas|pesos|clp|western union|paypal|mercado ?pago|webpay|tarjeta|clave|codigo|cvv|flete|reserva\w*)\b|\$ ?\d/i;

export function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function looksRisky(text: string) {
  return RISKY.test(normalizeText(text));
}

// Detecta datos personales que conviene no publicar en descripciones públicas.
const PHONE = /(\+?56)?\s?9[\s.-]?\d{4}[\s.-]?\d{4}/;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const ADDRESS = /\b(calle|pasaje|avenida|av\.|depto|departamento|block|casa)\s+[\w ]*\d+/i;

export function personalDataWarning(text: string): string | null {
  if (PHONE.test(text)) return "Parece que incluiste un teléfono. Por tu seguridad, usa el chat de la app.";
  if (EMAIL.test(text)) return "Parece que incluiste un correo. Por tu seguridad, usa el chat de la app.";
  if (ADDRESS.test(text))
    return "Parece que incluiste una dirección exacta. Indica solo un sector de referencia.";
  return null;
}
