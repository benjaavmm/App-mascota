import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  HeartHandshake,
  MapPin,
  Pencil,
  Ruler,
  Scale,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";

import { ContactButton } from "@/components/pets/contact-button";
import { PetGrid } from "@/components/pets/pet-card";
import {
  HiddenBadge,
  KindBadge,
  StatusBadge,
  UrgentBadge,
  VerifiedBadge,
} from "@/components/pets/pet-badges";
import { PetGallery } from "@/components/pets/pet-gallery";
import { SpeciesIcon } from "@/components/pets/species-icon";
import { FavoriteButton } from "@/components/pets/favorite-button";
import { ShareButton } from "@/components/pets/share-button";
import { ReportButton } from "@/components/safety/report-button";
import { SafetyTips } from "@/components/safety/safety-tips";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";
import { getCurrentProfile, isModerator, isOnboarded } from "@/lib/auth";
import { placeLabel } from "@/lib/chile";
import { ACCOUNT_TYPE_LABELS, ENERGY_LABELS, SEX_LABELS, SPECIES_LABELS, sizeLabel } from "@/lib/constants";
import { daysAgoIso, formatAge, formatDate } from "@/lib/format";
import { PET_CARD_COLUMNS, PET_DETAIL_COLUMNS, toProfileStats } from "@/lib/queries";
import { petPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

const getPet = cache(async (id: string) => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select(
      `${PET_DETAIL_COLUMNS}, pet_photos(id, storage_path, position, created_at), owner:profiles!pets_owner_id_fkey(id, display_name, avatar_path, account_type, verification_status, commune_code, created_at)`,
    )
    .eq("id", id)
    .order("position", { referencedTable: "pet_photos" })
    .order("created_at", { referencedTable: "pet_photos" })
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/mascotas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const pet = await getPet(id);
  if (!pet) return { title: "Publicación no encontrada" };
  const verb = pet.kind === "adoption" ? "en adopción" : pet.kind === "lost" ? "perdido" : "encontrado";
  const title = `${pet.name}, ${verb} en ${placeLabel(pet.commune_code)}`;
  const image = petPhotoUrl(pet.cover_path);
  return {
    title,
    description: pet.description.slice(0, 160),
    openGraph: { title, description: pet.description.slice(0, 160), images: image ? [image] : undefined },
  };
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-stone-400">Sin información</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 font-bold text-teal-700">
      <Check className="h-4 w-4" /> Sí
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-bold text-rose-600">
      <X className="h-4 w-4" /> No
    </span>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-3">
      <span className="mt-0.5 text-brand-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide text-stone-500 uppercase">{label}</p>
        <p className="font-semibold text-stone-800">{value}</p>
      </div>
    </div>
  );
}

function HealthItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          <Check className="h-4 w-4" />
        </span>
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400">
          <X className="h-4 w-4" />
        </span>
      )}
      <span className={ok ? "font-semibold text-stone-800" : "text-stone-500"}>{label}</span>
    </li>
  );
}

export default async function PetPage({ params }: PageProps<"/mascotas/[id]">) {
  const { id } = await params;
  const pet = await getPet(id);
  if (!pet) notFound();

  const supabase = await createClient();
  const viewer = await getCurrentProfile();
  const isOwner = viewer?.id === pet.owner_id;
  const owner = pet.owner;
  const photos = pet.pet_photos ?? [];
  const isAdoption = pet.kind === "adoption";
  const loginNext = `/mascotas/${pet.id}`;

  const [{ data: stats }, favoriteRes, applicationRes, ownerAppsRes, matchesRes] = await Promise.all([
    supabase.rpc("get_profile_stats", { p_user_id: pet.owner_id }),
    viewer && !isOwner
      ? supabase
          .from("favorites")
          .select("pet_id")
          .eq("pet_id", pet.id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    viewer && !isOwner && isAdoption
      ? supabase
          .from("applications")
          .select("id, status")
          .eq("pet_id", pet.id)
          .eq("applicant_id", viewer.id)
          .in("status", ["pending", "reviewing", "approved", "completed"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    isOwner && isAdoption
      ? supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("pet_id", pet.id)
          .in("status", ["pending", "reviewing", "approved"])
      : Promise.resolve({ count: 0 }),
    isOwner && pet.kind === "lost" && pet.status === "available"
      ? supabase
          .from("pets")
          .select(PET_CARD_COLUMNS)
          .eq("kind", "found")
          .eq("status", "available")
          .eq("hidden", false)
          .eq("species", pet.species)
          .eq("region_code", pet.region_code ?? "")
          .eq("size", pet.size)
          .in("sex", pet.sex === "unknown" ? ["male", "female", "unknown"] : [pet.sex, "unknown"])
          .gte("created_at", daysAgoIso(120))
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: null }),
  ]);

  const ownerStats = toProfileStats(stats);
  const isFavorite = Boolean(favoriteRes.data);
  const myApplication = applicationRes.data;
  const activeApplications = "count" in ownerAppsRes ? (ownerAppsRes.count ?? 0) : 0;
  const matches = matchesRes.data ?? [];
  const viewerReady = isOnboarded(viewer);

  const actionTitle = isAdoption
    ? `¿Quieres adoptar a ${pet.name}?`
    : pet.kind === "lost"
      ? `¿Viste a ${pet.name}?`
      : "¿Es tu mascota o sabes de quién es?";

  // Tarjeta con nombre y acciones: en móvil va bajo la galería; en escritorio, en la columna lateral.
  const actionCard = (
    <Card className="p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap gap-1.5">
        <KindBadge kind={pet.kind} />
        <StatusBadge status={pet.status} kind={pet.kind} />
        {pet.is_urgent && pet.status === "available" && <UrgentBadge />}
        {pet.hidden && <HiddenBadge />}
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">{pet.name}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-stone-600">
        <MapPin className="h-4 w-4 shrink-0" />
        {placeLabel(pet.commune_code)}
        {pet.location_hint && <span className="text-stone-500"> · {pet.location_hint}</span>}
      </p>
      {!isAdoption && pet.event_date && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
          <CalendarDays className="h-4 w-4" />
          {pet.kind === "lost" ? "Se perdió el " : "Se encontró el "}
          {formatDate(pet.event_date)}
        </p>
      )}
      <p className="mt-1 text-xs text-stone-400">Publicado el {formatDate(pet.created_at)}</p>

      <div className="mt-5 space-y-2.5">
        {isOwner ? (
          <>
            <ButtonLink href={`/mis-publicaciones/${pet.id}`} size="lg" className="w-full">
              <Pencil className="h-5 w-5" />
              Editar publicación
            </ButtonLink>
            {isAdoption && (
              <ButtonLink
                href={`/solicitudes?vista=recibidas&mascota=${pet.id}`}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                <ClipboardList className="h-5 w-5" />
                Ver solicitudes {activeApplications > 0 && `(${activeApplications})`}
              </ButtonLink>
            )}
          </>
        ) : (
          <>
            <p className="font-bold text-stone-800">{actionTitle}</p>
            {isAdoption && myApplication ? (
              <ButtonLink href={`/solicitudes/${myApplication.id}`} size="lg" className="w-full">
                <ClipboardList className="h-5 w-5" />
                Ver mi solicitud
              </ButtonLink>
            ) : isAdoption && pet.status === "available" && !pet.hidden ? (
              <ButtonLink
                href={
                  viewer
                    ? `/mascotas/${pet.id}/postular`
                    : `/ingresar?next=${encodeURIComponent(`/mascotas/${pet.id}/postular`)}`
                }
                size="lg"
                className="w-full"
              >
                <HeartHandshake className="h-5 w-5" />
                Quiero adoptar
              </ButtonLink>
            ) : null}
            {pet.status !== "archived" &&
              !pet.hidden &&
              (viewer ? (
                viewerReady ? (
                  <ContactButton
                    petId={pet.id}
                    variant={isAdoption ? "secondary" : "primary"}
                    label={
                      isAdoption
                        ? "Hacer una pregunta"
                        : pet.kind === "lost"
                          ? "Tengo información"
                          : "Es mi mascota / sé de quién es"
                    }
                  />
                ) : (
                  <ButtonLink
                    href={`/bienvenida?next=${encodeURIComponent(loginNext)}`}
                    variant="secondary"
                    size="lg"
                    className="w-full"
                  >
                    Completa tu perfil para escribir
                  </ButtonLink>
                )
              ) : (
                <ButtonLink
                  href={`/ingresar?next=${encodeURIComponent(loginNext)}`}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Ingresa para escribir
                </ButtonLink>
              ))}
          </>
        )}
        <div className="flex items-center gap-2 pt-1">
          {!isOwner && <FavoriteButton petId={pet.id} initial={isFavorite} signedIn={Boolean(viewer)} />}
          <ShareButton
            title={`${pet.name} · Huellitas`}
            text={
              isAdoption
                ? `${pet.name} busca hogar en ${placeLabel(pet.commune_code)}. ¡Ayuda compartiendo!`
                : pet.kind === "lost"
                  ? `Se busca a ${pet.name} en ${placeLabel(pet.commune_code)}. ¡Ayuda compartiendo!`
                  : `Encontraron esta mascota en ${placeLabel(pet.commune_code)}. ¿La conoces?`
            }
          />
          {!isOwner && (
            <div className="ml-auto">
              <ReportButton
                targetType="pet"
                targetId={pet.id}
                signedIn={Boolean(viewer)}
                loginNext={loginNext}
                variant="link"
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <Container className="py-6 sm:py-10">
      <Link
        href={`/mascotas?tipo=${isAdoption ? "adopcion" : pet.kind === "lost" ? "perdidos" : "encontrados"}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la búsqueda
      </Link>

      {pet.hidden && (isOwner || isModerator(viewer)) && (
        <Alert variant="danger" title="Esta publicación está oculta" className="mb-6">
          {pet.hidden_reason ?? "Moderación la está revisando."} Si crees que es un error, escríbenos desde tu
          perfil.
        </Alert>
      )}
      {pet.status === "adopted" && (
        <Alert variant="success" title={`¡${pet.name} ya encontró un hogar!`} className="mb-6">
          Gracias a todas las personas que ayudaron. Hay muchas más mascotas esperando una familia.
        </Alert>
      )}
      {pet.status === "reunited" && (
        <Alert variant="success" title={`¡${pet.name} está de vuelta en casa!`} className="mb-6">
          Gracias por compartir y ayudar en la búsqueda.
        </Alert>
      )}
      {(pet.status === "paused" || pet.status === "archived") && (
        <Alert variant="info" className="mb-6">
          Esta publicación está {pet.status === "paused" ? "pausada" : "archivada"} y no aparece en las
          búsquedas.
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <PetGallery name={pet.name} photos={photos} />
          <div className="lg:hidden">{actionCard}</div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-extrabold">Sobre {pet.name}</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-stone-700">{pet.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Fact
                icon={<SpeciesIcon species={pet.species} className="h-5 w-5" />}
                label="Especie"
                value={SPECIES_LABELS[pet.species]}
              />
              <Fact icon={<HeartHandshake className="h-5 w-5" />} label="Sexo" value={SEX_LABELS[pet.sex]} />
              <Fact
                icon={<CalendarDays className="h-5 w-5" />}
                label="Edad aproximada"
                value={formatAge(pet.birth_date_estimate)}
              />
              <Fact
                icon={<Ruler className="h-5 w-5" />}
                label="Tamaño"
                value={sizeLabel(pet.species, pet.size)}
              />
              {pet.weight_kg && (
                <Fact
                  icon={<Scale className="h-5 w-5" />}
                  label="Peso aproximado"
                  value={`${String(pet.weight_kg).replace(".", ",")} kg`}
                />
              )}
              <Fact icon={<ClipboardList className="h-5 w-5" />} label="Raza" value={pet.breed} />
              {pet.color && (
                <Fact icon={<ClipboardList className="h-5 w-5" />} label="Color" value={pet.color} />
              )}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-extrabold">Salud</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                <HealthItem ok={pet.vaccinated} label="Vacunas al día" />
                <HealthItem ok={pet.dewormed} label="Desparasitado" />
                <HealthItem ok={pet.sterilized} label="Esterilizado" />
                <HealthItem ok={pet.microchipped} label="Con microchip" />
              </ul>
              {pet.special_needs && (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Tiene necesidades especiales
                </p>
              )}
              {pet.health_notes && (
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-stone-600">
                  {pet.health_notes}
                </p>
              )}
            </Card>
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-extrabold">Personalidad</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">Energía</dt>
                  <dd className="font-bold">{pet.energy ? ENERGY_LABELS[pet.energy] : "Sin información"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">Con niños</dt>
                  <dd>
                    <YesNo value={pet.good_with_kids} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">
                    {pet.species === "dog" ? "Con otros perros" : "Con perros"}
                  </dt>
                  <dd>
                    <YesNo value={pet.good_with_dogs} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">
                    {pet.species === "cat" ? "Con otros gatos" : "Con gatos"}
                  </dt>
                  <dd>
                    <YesNo value={pet.good_with_cats} />
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          {isAdoption && pet.requirements && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-lg font-extrabold">Requisitos para adoptar</h2>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-stone-700">
                {pet.requirements}
              </p>
            </Card>
          )}

          {matches.length > 0 && (
            <section>
              <h2 className="mb-1 text-xl font-extrabold">Posibles coincidencias</h2>
              <p className="mb-4 text-sm text-stone-600">
                Mascotas encontradas recientemente en tu región con un tamaño parecido.
              </p>
              <PetGrid pets={matches} />
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">{actionCard}</div>

          {owner && (
            <Card className="p-5">
              <p className="mb-3 text-xs font-bold tracking-wide text-stone-500 uppercase">Publicado por</p>
              <Link href={`/usuarios/${owner.id}`} className="flex items-center gap-3">
                <Avatar name={owner.display_name} path={owner.avatar_path} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-stone-900 hover:underline">
                    {owner.display_name}
                  </p>
                  <p className="text-sm text-stone-500">{ACCOUNT_TYPE_LABELS[owner.account_type]}</p>
                  {owner.verification_status === "verified" && <VerifiedBadge />}
                </div>
              </Link>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <dt className="text-xs text-stone-500">Adopciones logradas</dt>
                  <dd className="text-lg font-extrabold">{ownerStats.adoptions_given}</dd>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <dt className="text-xs text-stone-500">En Huellitas desde</dt>
                  <dd className="text-sm font-extrabold">
                    {formatDate(owner.created_at).replace(/^\d+ de /, "")}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          <SafetyTips kind={pet.kind} />
        </aside>
      </div>
    </Container>
  );
}
