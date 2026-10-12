import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Política de privacidad</h1>
      <p className="mt-2 text-sm text-stone-500">Última actualización: octubre de 2026</p>
      <Alert variant="info" className="mt-6">
        Resumen: recolectamos lo mínimo, nunca vendemos tus datos y tú decides con quién compartes tu contacto.
      </Alert>

      <div className="prose-huellitas mt-4">
        <h2>Qué datos recolectamos</h2>
        <ul>
          <li>
            <strong>Cuenta:</strong> correo electrónico, nombre visible, comuna y tipo de cuenta. Tu declaración de mayoría de
            edad y la fecha en que aceptaste los términos.
          </li>
          <li>
            <strong>Opcional:</strong> teléfono, foto de perfil, presentación, sitio web e Instagram.
          </li>
          <li>
            <strong>Contenido:</strong> publicaciones, fotos, mensajes, solicitudes de adopción, seguimientos y reportes.
          </li>
          <li>
            <strong>Verificación:</strong> la información y documentos que envíes voluntariamente para verificar tu cuenta.
          </li>
        </ul>

        <h2>Qué es público y qué es privado</h2>
        <ul>
          <li>
            <strong>Público:</strong> tu nombre visible, foto de perfil, presentación, comuna, tipo de cuenta y tus
            publicaciones.
          </li>
          <li>
            <strong>Privado:</strong> tu correo y tu teléfono (solo los ve quien tú elijas en un chat), tus mensajes (solo las
            personas de la conversación), tus respuestas de adopción (solo quien publicó), las fotos de seguimiento (solo
            quien adoptó y quien entregó) y los documentos de verificación (solo moderación).
          </li>
        </ul>

        <h2>Cómo protegemos tus datos</h2>
        <ul>
          <li>Las reglas de acceso se aplican directamente en la base de datos (seguridad a nivel de fila).</li>
          <li>Las fotos se reducen y se les eliminan los metadatos, incluida la ubicación GPS, antes de subirlas.</li>
          <li>Mostramos solo la comuna, nunca direcciones exactas.</li>
          <li>Moderación solo accede al texto de un mensaje cuando una de las personas de la conversación lo reporta.</li>
          <li>Usamos únicamente cookies necesarias para mantener tu sesión iniciada.</li>
        </ul>

        <h2>Para qué usamos tus datos</h2>
        <p>
          Para operar la plataforma: mostrar publicaciones, gestionar solicitudes y mensajes, enviarte notificaciones,
          prevenir fraudes y moderar la comunidad. No vendemos ni compartimos tus datos con fines publicitarios.
        </p>

        <h2>Proveedores</h2>
        <p>
          Usamos proveedores de infraestructura (alojamiento web y base de datos) que procesan los datos solo para prestar el
          servicio.
        </p>

        <h2>Tus derechos</h2>
        <p>
          De acuerdo con la legislación chilena de protección de datos personales (Ley N° 19.628 y sus modificaciones),
          puedes acceder, rectificar y eliminar tus datos. Puedes editar tu información en{" "}
          <Link href="/perfil">Mi perfil</Link> y eliminar tu cuenta y todos tus datos en cualquier momento desde la misma
          página.
        </p>

        <h2>Conservación</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Al eliminarla, borramos tu perfil, publicaciones, fotos,
          mensajes y solicitudes. Los reportes que hayas enviado se conservan de forma anónima para fines de seguridad.
        </p>

        <h2>Contacto</h2>
        <p>Si tienes dudas sobre tu privacidad en {APP_NAME}, escríbenos al equipo de moderación.</p>
      </div>
    </Container>
  );
}
