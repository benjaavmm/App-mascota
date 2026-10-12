import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  HeartHandshake,
  Home,
  Lock,
  MessageCircleHeart,
  Search,
  ShieldCheck,
  Siren,
} from "lucide-react";
import Link from "next/link";

import { DogGrid } from "@/components/dogs/dog-card";
import { DogPhoto } from "@/components/dogs/dog-photo";
import { PawIcon } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { REGIONS } from "@/lib/chile";
import { DOG_CARD_COLUMNS } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

function SectionTitle({ title, description, href, linkLabel }: { title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 text-stone-600">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-1 font-bold text-brand-700 hover:underline sm:inline-flex">
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const STEPS = [
  { icon: Search, title: "Encuentra", text: "Busca por comuna, tamaño, edad y carácter. Todas las adopciones son gratuitas." },
  { icon: ClipboardCheck, title: "Postula", text: "Completa un cuestionario de adopción responsable. Quien publicó lo revisa con calma." },
  { icon: MessageCircleHeart, title: "Conversa seguro", text: "Chatea dentro de la app. Tu teléfono y correo solo se comparten si tú lo decides." },
  { icon: Home, title: "Adopta y acompaña", text: "Firma el acta de adopción y comparte seguimientos para asegurar su bienestar." },
];

const SAFETY = [
  { icon: Lock, title: "Datos protegidos", text: "Tu contacto y ubicación exacta nunca se publican. Las fotos se suben sin datos GPS." },
  { icon: BadgeCheck, title: "Fundaciones verificadas", text: "Revisamos a rescatistas y fundaciones antes de darles la insignia de verificación." },
  { icon: ShieldCheck, title: "Moderación activa", text: "Reportes confidenciales, bloqueo de usuarios y alertas automáticas ante posibles estafas." },
  { icon: HeartHandshake, title: "Seguimiento post-adopción", text: "Recordatorios a la semana, al mes, a los 3 y 6 meses para cuidar a cada perrito." },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const deleted = firstParam((await searchParams).cuenta) === "eliminada";
  const supabase = await createClient();

  const [{ data: stats }, { data: urgent }, { data: recent }, { data: lostFound }] = await Promise.all([
    supabase.rpc("get_public_stats"),
    supabase
      .from("dogs")
      .select(DOG_CARD_COLUMNS)
      .eq("kind", "adoption")
      .eq("status", "available")
      .eq("hidden", false)
      .eq("is_urgent", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("dogs")
      .select(DOG_CARD_COLUMNS)
      .eq("kind", "adoption")
      .eq("status", "available")
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("dogs")
      .select(DOG_CARD_COLUMNS)
      .in("kind", ["lost", "found"])
      .eq("status", "available")
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const s = (stats ?? {}) as Record<string, number>;
  const heroDogs = (recent ?? []).filter((d) => d.cover_path).slice(0, 3);

  return (
    <>
      {deleted && (
        <Container className="pt-6">
          <Alert variant="success">Tu cuenta y tus datos fueron eliminados. ¡Gracias por haber sido parte de Huellitas!</Alert>
        </Container>
      )}

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-32 h-80 w-80 rounded-full bg-teal-100/70 blur-3xl" />
        <Container className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-brand-700 shadow-xs">
              <PawIcon className="h-4 w-4" /> Adopción responsable en todo Chile
            </p>
            <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              Dale una segunda oportunidad a un <span className="text-brand-600">perrito de la calle</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-600">
              Conectamos perritos rescatados con familias responsables. Gratis, seguro y con acompañamiento después de
              la adopción.
            </p>
            <form action="/perritos" method="get" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-stone-200/60 sm:flex-row">
              <input type="hidden" name="tipo" value="adopcion" />
              <label htmlFor="hero-region" className="sr-only">
                Región
              </label>
              <Select id="hero-region" name="region" defaultValue="" className="border-0 shadow-none sm:flex-1">
                <option value="">Todas las regiones</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.shortName}
                  </option>
                ))}
              </Select>
              <button type="submit" className={buttonClasses({ size: "md" })}>
                <Search className="h-4 w-4" />
                Buscar perritos
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/publicar" variant="secondary">
                Publicar un perrito
              </ButtonLink>
              <ButtonLink href="/perritos?tipo=perdidos" variant="ghost">
                <Siren className="h-4 w-4 text-rose-600" />
                Perdí a mi perrito
              </ButtonLink>
            </div>
          </div>
          <div className="relative hidden h-[420px] lg:block">
            {heroDogs.length >= 2 ? (
              <>
                <DogPhoto path={heroDogs[0].cover_path} alt={heroDogs[0].name} priority className="absolute top-0 right-8 h-72 w-60 rotate-3 rounded-3xl shadow-xl ring-4 ring-white" sizes="240px" />
                <DogPhoto path={heroDogs[1].cover_path} alt={heroDogs[1].name} className="absolute bottom-0 left-4 h-64 w-56 -rotate-3 rounded-3xl shadow-xl ring-4 ring-white" sizes="224px" />
                {heroDogs[2] && (
                  <DogPhoto path={heroDogs[2].cover_path} alt={heroDogs[2].name} className="absolute right-0 bottom-6 h-40 w-36 rotate-6 rounded-3xl shadow-xl ring-4 ring-white" sizes="144px" />
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[3rem] bg-gradient-to-br from-brand-100 to-brand-200 text-brand-500">
                <PawIcon className="h-40 w-40" />
              </div>
            )}
          </div>
        </Container>
      </section>

      <Container>
        <dl className="grid grid-cols-2 gap-3 rounded-3xl bg-stone-900 p-6 text-white sm:grid-cols-4 sm:p-8">
          {[
            { label: "Buscan hogar", value: s.available },
            { label: "Ya adoptados", value: s.adopted },
            { label: "De vuelta en casa", value: s.reunited },
            { label: "Organizaciones verificadas", value: s.verified_orgs },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <dd className="text-3xl font-extrabold text-brand-300 sm:text-4xl">{(item.value ?? 0).toLocaleString("es-CL")}</dd>
              <dt className="mt-1 text-sm text-stone-300">{item.label}</dt>
            </div>
          ))}
        </dl>
      </Container>

      {urgent && urgent.length > 0 && (
        <Container className="mt-16">
          <SectionTitle title="Casos urgentes" description="Necesitan un hogar lo antes posible." href="/perritos?tipo=adopcion&urgente=1" linkLabel="Ver todos" />
          <DogGrid dogs={urgent} />
        </Container>
      )}

      <Container className="mt-16">
        <SectionTitle title="Recién llegados" description="Perritos que acaban de publicarse." href="/perritos" linkLabel="Ver todos" />
        {recent && recent.length > 0 ? (
          <DogGrid dogs={recent} />
        ) : (
          <p className="rounded-3xl bg-white p-8 text-center text-stone-600">Pronto verás perritos aquí. ¿Tienes uno que necesite hogar?</p>
        )}
        <div className="mt-6 text-center sm:hidden">
          <ButtonLink href="/perritos" variant="secondary">
            Ver todos los perritos
          </ButtonLink>
        </div>
      </Container>

      <section className="mt-20 bg-white py-16">
        <Container>
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">¿Cómo funciona?</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="rounded-3xl bg-cream p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-bold text-brand-700">Paso {index + 1}</p>
                <h3 className="text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {lostFound && lostFound.length > 0 && (
        <Container className="mt-16">
          <SectionTitle title="Perdidos y encontrados" description="Comparte: cada visualización acerca a un perrito a su casa." href="/perritos?tipo=perdidos" linkLabel="Ver más" />
          <DogGrid dogs={lostFound} />
        </Container>
      )}

      <Container className="mt-20">
        <div className="rounded-[2rem] bg-teal-900 p-8 text-white sm:p-12">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-bold text-teal-200">
              <ShieldCheck className="h-5 w-5" /> Seguridad primero
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Cuidamos a las personas y a los perritos</h2>
            <p className="mt-3 text-teal-100">
              Adoptar nunca tiene costo. Si alguien te pide dinero por un perrito, repórtalo: está prohibido en Huellitas.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SAFETY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/10 p-5">
                <Icon className="h-6 w-6 text-teal-200" />
                <h3 className="mt-3 font-extrabold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-teal-100">{text}</p>
              </div>
            ))}
          </div>
          <ButtonLink href="/seguridad" variant="secondary" className="mt-8">
            Conoce el centro de seguridad
          </ButtonLink>
        </div>
      </Container>

      <Container className="mt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border-2 border-dashed border-brand-300 bg-brand-50 p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">¿Eres rescatista o fundación?</h2>
            <p className="mt-2 max-w-xl text-stone-600">
              Publica sin límites, recibe postulaciones ordenadas y obtén la insignia de cuenta verificada para generar
              más confianza.
            </p>
          </div>
          <ButtonLink href="/perfil#verificacion" size="lg">
            Verificar mi cuenta
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
