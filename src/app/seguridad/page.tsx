import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Eye,
  Flag,
  Handshake,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/alert";
import { Card, Container } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Centro de seguridad",
  description: "Cómo adoptar, publicar y reencontrar mascotas de forma segura. Señales de estafa y cómo denunciar maltrato animal en Chile.",
};

const GOLDEN_RULES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Ban, title: "Adoptar es gratis", text: "Nunca pagues “reservas”, “traslados”, “vacunas” ni “gastos” por adelantado. Cobrar por una mascota está prohibido en Huellitas." },
  { icon: MessageCircle, title: "Conversa dentro de la app", text: "El chat protege tu teléfono y tu correo. Comparte tu contacto solo cuando confíes en la otra persona." },
  { icon: Lock, title: "Nunca compartas códigos ni claves", text: "Nadie necesita tu clave bancaria ni el código que te llega por SMS o WhatsApp. Si te lo piden, es una estafa." },
  { icon: MapPin, title: "Reúnete en lugares seguros", text: "Coordina encuentros en lugares públicos y concurridos, de día, y ve acompañado/a. Avisa a alguien dónde estarás." },
  { icon: Eye, title: "Desconfía de la presión", text: "Las prisas, historias muy dramáticas y la negativa a hacer una videollamada son señales de alerta." },
  { icon: Flag, title: "Reporta", text: "Si algo no te parece correcto, repórtalo. Es confidencial y nos ayuda a proteger a toda la comunidad." },
];

const SCAM_SIGNS = [
  "Te piden dinero antes de conocer a la mascota (transferencia, depósito, “cuenta RUT”, giro).",
  "Ofrecen animales “de raza” regalados desde otra ciudad, con envío pagado por ti.",
  "Se niegan a una videollamada o a mostrar a la mascota en persona.",
  "Te piden el código de verificación que llegó a tu teléfono (robo de WhatsApp o cuentas).",
  "Te envían enlaces raros para “confirmar la adopción” o “pagar el seguro”.",
  "Quien dice haber encontrado a tu mascota pide una recompensa antes de mostrarla.",
  "La historia cambia, hay contradicciones o mucha urgencia para cerrar el trato.",
];

export default function SafetyPage() {
  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Centro de seguridad</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-stone-600">
          Queremos que cada adopción y cada reencuentro sea seguro para las personas y para los animales.
        </p>
      </div>

      <Alert variant="danger" title="¿Hay una emergencia?" className="mt-10">
        Si un animal está siendo maltratado ahora o una persona está en peligro, llama a <strong>Carabineros: 133</strong> o
        a la <strong>PDI: 134</strong>.
      </Alert>

      <h2 className="mt-12 text-2xl font-extrabold">Reglas de oro</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {GOLDEN_RULES.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="flex gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-extrabold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{text}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="prose-huellitas mt-4">
        <h2 className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" /> Señales de estafa
        </h2>
        <ul>
          {SCAM_SIGNS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p>
          Huellitas revisa automáticamente los mensajes que mencionan dinero, cuentas o códigos y muestra una advertencia a
          ambas partes. Aun así, la mejor protección es tu criterio: <strong>ante la duda, no transfieras</strong>.
        </p>

        <h2>Si vas a dar una mascota en adopción</h2>
        <ul>
          <li>Lee con calma las respuestas del cuestionario y conversa por el chat antes de decidir.</li>
          <li>Pide una videollamada para conocer el lugar donde vivirá la mascota.</li>
          <li>No entregues a menores de edad ni a quien muestre interés en cruzarla, revenderla o usarla como animal de guardia o de trabajo sin los cuidados que necesita.</li>
          <li>Si puedes, entrégala esterilizada, vacunada y, si es perro o gato, con microchip.</li>
          <li>Firma el <strong>acta de adopción</strong> (la generamos automáticamente al aprobar una solicitud) y acuerda los seguimientos.</li>
          <li>Confirma la adopción en la app solo cuando la entrega se haya realizado.</li>
        </ul>

        <h2>Si vas a adoptar</h2>
        <ul>
          <li>Desconfía si te piden dinero. Una fundación puede invitarte a donar, pero nunca debe condicionar la adopción a un pago.</li>
          <li>Pregunta por su salud, carácter y por qué busca hogar. Pide su carnet de vacunas o registro veterinario.</li>
          <li>Ve acompañado/a al encuentro y revisa a la mascota antes de llevártela.</li>
          <li>Cumple tus compromisos: esterilización, registro (obligatorio para perros y gatos), vacunas y seguimientos.</li>
        </ul>

        <h2>Perdidos y encontrados</h2>
        <ul>
          <li>Si encontraste una mascota, llévala a una veterinaria o a tu municipalidad para leer su microchip, si tiene: suele ser gratis.</li>
          <li>Antes de entregarlo, pide pruebas: fotos antiguas, carnet de vacunas, registro del microchip o que la mascota reconozca a su familia.</li>
          <li>Si perdiste a tu mascota, desconfía de quien pida dinero antes de mostrártela. Pide una foto actual o una videollamada.</li>
          <li>Revisa el Registro Nacional de Mascotas (registratumascota.cl) y avisa en tu municipalidad.</li>
        </ul>

        <h2 id="denunciar">Cómo denunciar maltrato animal</h2>
        <p>
          En Chile el maltrato animal es un delito (Código Penal) y la Ley N° 21.020 de Tenencia Responsable establece
          obligaciones para quienes cuidan mascotas, incluido no abandonarlas. Puedes denunciar en:
        </p>
        <ul>
          <li>
            <strong>Carabineros (133)</strong> o cualquier comisaría.
          </li>
          <li>
            <strong>PDI (134)</strong>, a través de su Brigada Investigadora de Delitos contra el Medio Ambiente (BIDEMA).
          </li>
          <li>
            <strong>Fiscalía</strong>, de forma presencial o en su sitio web.
          </li>
          <li>
            <strong>Tu municipalidad</strong>, especialmente en casos de abandono o tenencia irresponsable.
          </li>
        </ul>
        <p>
          Reúne evidencia sin ponerte en riesgo: fotos, videos, fechas, horarios y la dirección. En Huellitas, usa el botón
          <strong> Reportar</strong>: los casos de maltrato se marcan como urgentes para moderación.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-extrabold">Cómo te protege Huellitas</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          { icon: Phone, title: "Contacto privado", text: "Tu teléfono y correo nunca se publican. Solo los ve quien tú elijas, conversación por conversación." },
          { icon: MapPin, title: "Sin ubicaciones exactas", text: "Mostramos solo la comuna. Las fotos se suben sin datos GPS y te advertimos si escribes una dirección." },
          { icon: BadgeCheck, title: "Cuentas verificadas", text: "Rescatistas y fundaciones pueden verificarse. Revisamos cada solicitud manualmente." },
          { icon: Handshake, title: "Proceso de adopción ordenado", text: "Cuestionario, aprobación, acta de adopción y seguimientos a 1 semana, 1, 3 y 6 meses." },
          { icon: Ban, title: "Bloqueos y límites", text: "Puedes bloquear a cualquier persona. Limitamos publicaciones, mensajes y solicitudes para evitar spam." },
          { icon: Flag, title: "Moderación activa", text: "Los reportes son confidenciales. Si una publicación recibe varios reportes, se oculta mientras se revisa." },
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title} className="flex gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-extrabold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{text}</p>
            </div>
          </Card>
        ))}
      </div>
    </Container>
  );
}
