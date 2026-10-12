import { Search, Users } from "lucide-react";
import Link from "next/link";

import { setUserRoleAction } from "@/actions/admin";
import { AccountModerationActions } from "@/components/admin/moderation-actions";
import { VerifiedBadge } from "@/components/dogs/dog-badges";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input, Select } from "@/components/ui/field";
import { getCurrentProfile, isAdmin, requireModerator } from "@/lib/auth";
import { ACCOUNT_STATUS_LABELS, ACCOUNT_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim().slice(0, 60) ?? "";
  const estado = firstParam(params.estado);
  const me = await getCurrentProfile();
  const admin = isAdmin(me);
  // El layout ya verifica el rol, pero cada página lo vuelve a comprobar (los layouts no se
  // re-ejecutan en todas las navegaciones). La base de datos también lo exige.
  await requireModerator();
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_path, account_type, role, verification_status, account_status, suspended_until, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.ilike("display_name", `%${q.replace(/[%_\\]/g, "")}%`);
  if (estado === "suspendidas") query = query.neq("account_status", "active");
  if (estado === "equipo") query = query.neq("role", "user");
  const { data: users } = await query;

  return (
    <div>
      <form className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre" className="max-w-xs flex-1" />
        <Select name="estado" defaultValue={estado ?? ""} className="max-w-48">
          <option value="">Todas las cuentas</option>
          <option value="suspendidas">Suspendidas o bloqueadas</option>
          <option value="equipo">Equipo de moderación</option>
        </Select>
        <button type="submit" className={buttonClasses({ size: "sm" })}>
          <Search className="h-4 w-4" />
          Buscar
        </button>
      </form>
      {!users?.length ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="Sin resultados" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={u.display_name} path={u.avatar_path} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/usuarios/${u.id}`} className="font-extrabold hover:underline">
                      {u.display_name}
                    </Link>
                    {u.verification_status === "verified" && <VerifiedBadge compact />}
                    {u.role !== "user" && <Badge tone="teal">{ROLE_LABELS[u.role]}</Badge>}
                    {u.account_status !== "active" && (
                      <Badge tone="rose">{ACCOUNT_STATUS_LABELS[u.account_status]}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-stone-500">
                    {ACCOUNT_TYPE_LABELS[u.account_type]} · desde {formatDate(u.created_at)}
                    {u.account_status === "suspended" &&
                      u.suspended_until &&
                      ` · hasta ${formatDate(u.suspended_until)}`}
                  </p>
                </div>
                {u.id !== me?.id && (admin || u.role === "user") && (
                  <AccountModerationActions userId={u.id} name={u.display_name} status={u.account_status} />
                )}
              </div>
              {admin && u.id !== me?.id && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                  {(["user", "moderator", "admin"] as const)
                    .filter((role) => role !== u.role)
                    .map((role) => (
                      <ConfirmAction
                        key={role}
                        action={setUserRoleAction}
                        fields={{ user_id: u.id, role }}
                        label={`Rol: ${ROLE_LABELS[role]}`}
                        variant="ghost"
                        size="sm"
                        title={`¿Cambiar el rol de ${u.display_name} a “${ROLE_LABELS[role]}”?`}
                        description={
                          role === "user"
                            ? "Perderá el acceso al panel de moderación."
                            : "Podrá ver reportes y moderar contenido."
                        }
                      />
                    ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
