import { PawPrint, Search } from "lucide-react";
import Link from "next/link";

import { PetModerationAction } from "@/components/admin/moderation-actions";
import { HiddenBadge, KindBadge, StatusBadge } from "@/components/pets/pet-badges";
import { PetPhoto } from "@/components/pets/pet-photo";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Checkbox, Input } from "@/components/ui/field";
import { placeLabel } from "@/lib/chile";
import { formatRelative } from "@/lib/format";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

export default async function AdminPetsPage({ searchParams }: PageProps<"/admin/publicaciones">) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim().slice(0, 60) ?? "";
  const onlyHidden = firstParam(params.ocultas) === "1";
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();

  let query = supabase
    .from("pets")
    .select(
      "id, name, kind, status, hidden, hidden_reason, cover_path, commune_code, created_at, owner:profiles!pets_owner_id_fkey(id, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\]/g, "")}%`);
  if (onlyHidden) query = query.eq("hidden", true);
  const { data: pets } = await query;

  return (
    <div>
      <form className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre del perrito"
          className="max-w-xs flex-1"
        />
        <Checkbox id="ocultas" name="ocultas" value="1" defaultChecked={onlyHidden} label="Solo ocultas" />
        <button type="submit" className={buttonClasses({ size: "sm" })}>
          <Search className="h-4 w-4" />
          Buscar
        </button>
      </form>
      {!pets?.length ? (
        <EmptyState icon={<PawPrint className="h-10 w-10" />} title="Sin resultados" />
      ) : (
        <div className="space-y-3">
          {pets.map((pet) => (
            <Card key={pet.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <PetPhoto
                path={pet.cover_path}
                alt={pet.name}
                className="h-16 w-20 shrink-0 rounded-xl"
                sizes="80px"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/mascotas/${pet.id}`} className="font-extrabold hover:underline">
                    {pet.name}
                  </Link>
                  <KindBadge kind={pet.kind} />
                  <StatusBadge status={pet.status} kind={pet.kind} />
                  {pet.hidden && <HiddenBadge />}
                </div>
                <p className="text-sm text-stone-500">
                  {placeLabel(pet.commune_code)} · por{" "}
                  {pet.owner ? (
                    <Link href={`/usuarios/${pet.owner.id}`} className="font-semibold hover:underline">
                      {pet.owner.display_name}
                    </Link>
                  ) : (
                    "—"
                  )}{" "}
                  · {formatRelative(pet.created_at)}
                </p>
                {pet.hidden_reason && <p className="mt-1 text-xs text-rose-700">{pet.hidden_reason}</p>}
              </div>
              <PetModerationAction petId={pet.id} petName={pet.name} hidden={pet.hidden} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
