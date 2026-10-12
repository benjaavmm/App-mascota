import { PawPrint, Search } from "lucide-react";
import Link from "next/link";

import { DogModerationAction } from "@/components/admin/moderation-actions";
import { HiddenBadge, KindBadge, StatusBadge } from "@/components/dogs/dog-badges";
import { DogPhoto } from "@/components/dogs/dog-photo";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Checkbox, Input } from "@/components/ui/field";
import { placeLabel } from "@/lib/chile";
import { formatRelative } from "@/lib/format";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

export default async function AdminDogsPage({ searchParams }: PageProps<"/admin/publicaciones">) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim().slice(0, 60) ?? "";
  const onlyHidden = firstParam(params.ocultas) === "1";
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();

  let query = supabase
    .from("dogs")
    .select(
      "id, name, kind, status, hidden, hidden_reason, cover_path, commune_code, created_at, owner:profiles!dogs_owner_id_fkey(id, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\]/g, "")}%`);
  if (onlyHidden) query = query.eq("hidden", true);
  const { data: dogs } = await query;

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
      {!dogs?.length ? (
        <EmptyState icon={<PawPrint className="h-10 w-10" />} title="Sin resultados" />
      ) : (
        <div className="space-y-3">
          {dogs.map((dog) => (
            <Card key={dog.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <DogPhoto
                path={dog.cover_path}
                alt={dog.name}
                className="h-16 w-20 shrink-0 rounded-xl"
                sizes="80px"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/perritos/${dog.id}`} className="font-extrabold hover:underline">
                    {dog.name}
                  </Link>
                  <KindBadge kind={dog.kind} />
                  <StatusBadge status={dog.status} kind={dog.kind} />
                  {dog.hidden && <HiddenBadge />}
                </div>
                <p className="text-sm text-stone-500">
                  {placeLabel(dog.commune_code)} · por{" "}
                  {dog.owner ? (
                    <Link href={`/usuarios/${dog.owner.id}`} className="font-semibold hover:underline">
                      {dog.owner.display_name}
                    </Link>
                  ) : (
                    "—"
                  )}{" "}
                  · {formatRelative(dog.created_at)}
                </p>
                {dog.hidden_reason && <p className="mt-1 text-xs text-rose-700">{dog.hidden_reason}</p>}
              </div>
              <DogModerationAction dogId={dog.id} dogName={dog.name} hidden={dog.hidden} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
