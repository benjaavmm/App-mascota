import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PawIcon } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/card";
import { PrintButton } from "@/components/ui/print-button";
import { requireProfile } from "@/lib/auth";
import { placeLabel } from "@/lib/chile";
import { APP_NAME, SEX_LABELS, SIZE_SHORT } from "@/lib/constants";
import { formatAge, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Acta de adopción" };

function Blank({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2 py-1.5">
      <span className="shrink-0 text-sm text-stone-600">{label}:</span>
      <span className="h-5 flex-1 border-b border-dotted border-stone-400" />
    </div>
  );
}

export default async function AdoptionActPage({ params }: PageProps<"/solicitudes/[id]/acta">) {
  const { id } = await params;
  const profile = await requireProfile(`/solicitudes/${id}/acta`);
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, completed_at, decided_at, applicant_id, publisher_id, dog:dogs!applications_dog_id_fkey(name, sex, size, birth_date_estimate, breed, color, sterilized, vaccinated, dewormed, microchipped, health_notes, commune_code), applicant:profiles!applications_applicant_id_fkey(display_name), publisher:profiles!applications_publisher_id_fkey(display_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!app || ![app.applicant_id, app.publisher_id].includes(profile.id)) notFound();
  if (app.status !== "approved" && app.status !== "completed") {
    return (
      <Container className="max-w-2xl py-10">
        <Alert variant="info">El acta estará disponible cuando la solicitud sea aprobada.</Alert>
      </Container>
    );
  }

  const dog = app.dog;
  const date = formatDate(app.completed_at ?? new Date());
  const yes = (v: boolean | undefined) => (v ? "Sí" : "No");

  return (
    <Container className="max-w-3xl py-8 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/solicitudes/${app.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" />
          Volver a la solicitud
        </Link>
        <PrintButton />
      </div>
      <Alert variant="info" className="no-print mb-6">
        Imprime dos copias (una para cada parte) y complétenlas a mano el día de la entrega. Por tu privacidad, Huellitas
        no guarda RUT ni direcciones.
      </Alert>

      <article className="rounded-3xl border border-stone-200 bg-white p-8 text-stone-900 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2 font-extrabold">
            <PawIcon className="h-6 w-6 text-brand-600" />
            {APP_NAME}
          </div>
          <p className="text-sm text-stone-500">Folio {app.id.slice(0, 8).toUpperCase()}</p>
        </header>

        <h1 className="mt-6 text-center text-2xl font-extrabold">Acta de Adopción Responsable</h1>
        <p className="mt-1 text-center text-sm text-stone-600">Fecha: {date}</p>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="mb-2 font-extrabold">Quien entrega</h2>
            <p className="text-sm">
              Usuario en {APP_NAME}: <strong>{app.publisher?.display_name}</strong>
            </p>
            <Blank label="Nombre completo" />
            <Blank label="RUT" />
            <Blank label="Teléfono" />
          </div>
          <div>
            <h2 className="mb-2 font-extrabold">Quien adopta</h2>
            <p className="text-sm">
              Usuario en {APP_NAME}: <strong>{app.applicant?.display_name}</strong>
            </p>
            <Blank label="Nombre completo" />
            <Blank label="RUT" />
            <Blank label="Teléfono" />
            <Blank label="Domicilio" />
          </div>
        </section>

        {dog && (
          <section className="mt-8">
            <h2 className="mb-2 font-extrabold">Datos del perrito</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100">
                {[
                  ["Nombre", dog.name],
                  ["Sexo", SEX_LABELS[dog.sex]],
                  ["Edad aproximada", formatAge(dog.birth_date_estimate)],
                  ["Tamaño", SIZE_SHORT[dog.size]],
                  ["Raza / color", [dog.breed, dog.color].filter(Boolean).join(" · ")],
                  ["Comuna de origen", placeLabel(dog.commune_code)],
                  ["Vacunado / desparasitado", `${yes(dog.vaccinated)} / ${yes(dog.dewormed)}`],
                  ["Esterilizado", yes(dog.sterilized)],
                  ["Microchip", dog.microchipped ? "Sí — N°: ____________________" : "No"],
                  ["Observaciones de salud", dog.health_notes ?? "—"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="w-1/3 py-2 pr-4 text-stone-600">{label}</td>
                    <td className="py-2 font-semibold">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-2 font-extrabold">Compromisos de quien adopta</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Brindar alimentación, agua, abrigo, paseos y un trato digno, de acuerdo con la Ley N° 21.020 sobre Tenencia Responsable de Mascotas.</li>
            <li>Entregar atención veterinaria oportuna, mantener sus vacunas y desparasitaciones al día.</li>
            <li>Esterilizarlo si aún no lo está, en un plazo acordado de ________ semanas.</li>
            <li>Inscribirlo en el Registro Nacional de Mascotas (registratumascota.cl) e identificarlo con microchip.</li>
            <li>No venderlo, regalarlo ni entregarlo a terceros sin avisar previamente a quien lo entrega.</li>
            <li>Si no puede seguir cuidándolo, devolverlo a quien lo entrega. Nunca abandonarlo: el abandono de mascotas está sancionado por la Ley N° 21.020.</li>
            <li>Enviar los seguimientos acordados (1 semana, 1, 3 y 6 meses) a través de {APP_NAME}.</li>
            <li>La adopción es gratuita: ninguna de las partes ha pagado ni recibido dinero por este perrito.</li>
          </ol>
        </section>

        <section className="mt-12 grid grid-cols-2 gap-10">
          <div className="text-center">
            <div className="h-16 border-b border-stone-400" />
            <p className="mt-2 text-sm font-semibold">Firma de quien entrega</p>
          </div>
          <div className="text-center">
            <div className="h-16 border-b border-stone-400" />
            <p className="mt-2 text-sm font-semibold">Firma de quien adopta</p>
          </div>
        </section>
      </article>
    </Container>
  );
}
