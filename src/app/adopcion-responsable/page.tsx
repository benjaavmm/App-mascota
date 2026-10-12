import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Guía de adopción responsable",
  description: "Todo lo que necesitas saber antes, durante y después de adoptar una mascota en Chile.",
};

const CHECKLIST = [
  "Puedo cuidarla durante toda su vida (en muchas especies, 10 a 15 años o más; un caballo puede vivir más de 25).",
  "Todas las personas de mi hogar están de acuerdo.",
  "Tengo tiempo todos los días para su compañía, ejercicio, juegos y educación.",
  "Puedo cubrir alimento, veterinario, vacunas, desparasitación e imprevistos.",
  "Mi vivienda permite mascotas, tiene el espacio que su especie necesita y es segura (rejas, mallas en balcones y ventanas).",
  "Sé con quién quedará si viajo, me enfermo o me mudo.",
];

export default function ResponsibleAdoptionPage() {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <p className="text-sm font-bold text-brand-700">Guía</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Adopción responsable</h1>
      <p className="mt-3 text-lg text-stone-600">
        Adoptar cambia una vida… y la tuya también. Esta guía te ayuda a preparar todo para que la llegada de
        tu nuevo compañero sea un éxito.
      </p>

      <Card className="mt-8 p-6">
        <h2 className="text-xl font-extrabold">¿Estás listo/a? Revisa esta lista</h2>
        <ul className="mt-4 space-y-3">
          {CHECKLIST.map((item) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              <span className="text-stone-700">{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="prose-huellitas mt-4">
        <h2>Antes de que llegue</h2>
        <ul>
          <li>
            Prepara lo básico según su especie: cama o refugio, agua, comida y un espacio seguro. Si es un
            perro, suma correa, arnés y un collar con placa de identificación.
          </li>
          <li>Pregunta qué alimento come para hacer cualquier cambio de forma gradual.</li>
          <li>Busca un veterinario de confianza cerca de tu casa que atienda a su especie.</li>
          <li>Asegura rejas, puertas, balcones y ventanas. Guarda productos tóxicos y cables.</li>
        </ul>

        <h2>Los primeros días: la regla del 3-3-3</h2>
        <p>
          Muchas mascotas rescatadas necesitan tiempo para sentirse seguras. Como referencia:{" "}
          <strong>3 días</strong> para descomprimirse, <strong>3 semanas</strong> para aprender la rutina y{" "}
          <strong>3 meses</strong> para sentirse en casa.
        </p>
        <ul>
          <li>Dale un espacio tranquilo y no la obligues a interactuar.</li>
          <li>Mantén horarios fijos de comida, juego y, si es un perro, de paseo.</li>
          <li>Usa refuerzo positivo: premia lo que hace bien. Nunca castigos físicos.</li>
          <li>
            Presenta con calma y de a poco a otros animales del hogar, siempre con supervisión (si es un
            perro, en un lugar neutral y con correa).
          </li>
        </ul>

        <h2>Salud</h2>
        <ul>
          <li>
            <strong>Vacunas:</strong> mantén al día las vacunas que correspondan a su especie, según indique
            tu veterinario (en perros y gatos, incluida la antirrábica anual).
          </li>
          <li>
            <strong>Desparasitación:</strong> interna y externa, de forma periódica.
          </li>
          <li>
            <strong>Esterilización:</strong> previene camadas no deseadas (la principal causa de animales en
            la calle) y reduce enfermedades. Muchas municipalidades ofrecen operativos gratuitos o de bajo
            costo para perros y gatos.
          </li>
          <li>
            <strong>Microchip y registro:</strong> la Ley N° 21.020 exige identificar a perros y gatos con
            microchip e inscribirlos en el Registro Nacional de Mascotas (registratumascota.cl).
          </li>
        </ul>

        <h2>Según la especie</h2>
        <ul>
          <li>
            <strong>Perros:</strong> necesitan paseos diarios con correa, socialización y educación con
            refuerzo positivo.
          </li>
          <li>
            <strong>Gatos:</strong> arenero limpio y lejos de su comida, rascador y mallas en ventanas y
            balcones: las caídas son muy frecuentes.
          </li>
          <li>
            <strong>Conejos y roedores:</strong> espacio para moverse todos los días (no solo una jaula
            pequeña), alimentación específica para su especie (conejos, cuyes y chinchillas necesitan heno
            fresco a diario) y un veterinario de exóticos.
          </li>
          <li>
            <strong>Aves domésticas:</strong> una jaula amplia donde puedan abrir las alas, compañía y
            estímulo diario. Adopta solo aves domésticas: nunca aves silvestres.
          </li>
          <li>
            <strong>Caballos:</strong> necesitan terreno y refugio adecuados, herrador y veterinario equino.
            Su alimentación y cuidados tienen costos altos: evalúalos bien antes de adoptar.
          </li>
        </ul>

        <h2>Lo que dice la ley (Ley N° 21.020 “Ley Cholito”)</h2>
        <p>
          La Ley de Tenencia Responsable de Mascotas establece que quien cuida a un animal de compañía debe,
          entre otras cosas:
        </p>
        <ul>
          <li>
            Darle alimento, albergue y buen trato, y brindarle los cuidados veterinarios indispensables.
          </li>
          <li>Inscribirlo en el registro e identificarlo (obligatorio para perros y gatos).</li>
          <li>No abandonarlo: el abandono está sancionado.</li>
          <li>Hacerse responsable de los daños que pueda causar.</li>
        </ul>
        <p>
          Consulta en tu municipalidad las ordenanzas locales y los programas de tenencia responsable
          disponibles.
        </p>

        <h2>Seguimiento</h2>
        <p>
          En Huellitas, cada adopción incluye seguimientos breves a la semana, al mes, a los 3 y a los 6
          meses. Son una forma de dar tranquilidad a quien rescató a la mascota y de detectar a tiempo
          cualquier problema. ¡Y también de compartir fotos felices!
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/mascotas" size="lg">
          Ver mascotas en adopción
        </ButtonLink>
        <ButtonLink href="/seguridad" variant="secondary" size="lg">
          Centro de seguridad
        </ButtonLink>
      </div>
    </Container>
  );
}
