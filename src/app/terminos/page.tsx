import type { Metadata } from "next";

import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Términos y normas de la comunidad" };

export default function TermsPage() {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Términos y normas de la comunidad</h1>
      <p className="mt-2 text-sm text-stone-500">Última actualización: octubre de 2026</p>
      <Alert variant="info" className="mt-6">
        Este texto es una base. Si operas {APP_NAME} públicamente, revísalo con asesoría legal.
      </Alert>

      <div className="prose-huellitas mt-4">
        <h2>1. Qué es {APP_NAME}</h2>
        <p>
          {APP_NAME} es una plataforma gratuita que conecta a personas, rescatistas y fundaciones para dar en adopción a
          mascotas rescatadas y ayudar a reencontrar mascotas perdidas. Es exclusivamente para animales domésticos (perros,
          gatos, conejos, roedores, aves domésticas, caballos y otros animales de compañía o de granja). {APP_NAME} no es
          dueño de los animales publicados ni participa en los acuerdos entre las partes: es un punto de encuentro.
        </p>

        <h2>2. Requisitos para usar {APP_NAME}</h2>
        <ul>
          <li>Ser mayor de 18 años.</li>
          <li>Entregar información verdadera y mantener tu cuenta segura.</li>
          <li>Usar una sola cuenta personal. Las organizaciones pueden tener su propia cuenta.</li>
        </ul>

        <h2>3. Normas de la comunidad</h2>
        <p>Está prohibido:</p>
        <ul>
          <li>
            <strong>Vender animales o cobrar por adoptarlos</strong>, de forma directa o encubierta (“reserva”, “traslado”,
            “gastos”, “donación obligatoria”).
          </li>
          <li>Publicar animales para cruza, crianza comercial, peleas o cualquier fin que afecte su bienestar.</li>
          <li>Publicar información falsa, fotos que no correspondan o animales que ya no estén disponibles.</li>
          <li>
            Publicar fauna silvestre o exótica (aves nativas, reptiles, primates u otros animales silvestres), cuya captura,
            tenencia y comercio están regulados por la Ley de Caza N° 19.473 y fiscalizados por el SAG.
          </li>
          <li>Acosar, amenazar, discriminar o insultar a otras personas.</li>
          <li>Suplantar a otras personas u organizaciones.</li>
          <li>Pedir datos bancarios, claves o códigos de verificación.</li>
          <li>Publicar datos personales de terceros o direcciones exactas.</li>
          <li>Enviar spam, publicidad o enlaces engañosos.</li>
          <li>Usar {APP_NAME} para cualquier actividad ilegal, incluido el maltrato animal.</li>
        </ul>

        <h2>4. Publicaciones</h2>
        <ul>
          <li>Eres responsable del contenido que publicas y de tener derecho a usar las fotos.</li>
          <li>Debes mantener tus publicaciones al día (pausarlas o cerrarlas cuando corresponda).</li>
          <li>Puedes pedir compromisos de cuidado (esterilización, seguimiento, visitas), nunca dinero.</li>
        </ul>

        <h2>5. Adopciones</h2>
        <ul>
          <li>Las adopciones son acuerdos entre quien entrega y quien adopta.</li>
          <li>Quien adopta se compromete a cumplir la Ley N° 21.020 y los compromisos aceptados en su solicitud.</li>
          <li>Recomendamos firmar el acta de adopción que genera la plataforma y completar los seguimientos.</li>
        </ul>

        <h2>6. Moderación</h2>
        <p>
          Podemos ocultar publicaciones, suspender o bloquear cuentas que infrinjan estas normas, y colaborar con las
          autoridades cuando exista un posible delito. Las acciones de moderación quedan registradas. Si crees que se
          cometió un error, puedes escribirnos.
        </p>

        <h2>7. Responsabilidad</h2>
        <p>
          Hacemos nuestro mejor esfuerzo para mantener una comunidad segura, pero no podemos garantizar la conducta de las
          personas usuarias ni el estado de salud o comportamiento de los animales publicados. Sigue siempre las
          recomendaciones del Centro de seguridad.
        </p>

        <h2>8. Cambios</h2>
        <p>Podemos actualizar estos términos. Te avisaremos dentro de la plataforma cuando haya cambios importantes.</p>
      </div>
    </Container>
  );
}
