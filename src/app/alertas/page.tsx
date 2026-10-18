import { BellRing, Search, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { deleteAlert } from "@/actions/alerts";
import { NewAlertForm } from "@/components/alerts/new-alert-form";
import { PushToggle } from "@/components/layout/push-toggle";
import { SpeciesIcon } from "@/components/pets/species-icon";
import { Alert } from "@/components/ui/alert";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_ALERTS, alertSearchHref, alertSummary } from "@/lib/alerts";
import { requireProfile } from "@/lib/auth";
import { getCommune } from "@/lib/chile";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis alertas" };

export default async function AlertsPage() {
  const profile = await requireProfile("/alertas");
  const supabase = await createClient();
  const { data } = await supabase
    .from("pet_alerts")
    .select("id, kind, species, region_code, commune_code, size, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  const alerts = data ?? [];
  const full = alerts.length >= MAX_ALERTS;

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader
        title="Mis alertas"
        description="Te avisamos en tus notificaciones apenas se publique una mascota que coincida. Ideal si buscas a tu mascota perdida o una especie en particular."
      />

      <PushToggle compact />

      <section aria-labelledby="alertas-activas" className="mb-8">
        <h2 id="alertas-activas" className="mb-3 text-lg font-extrabold">
          Alertas activas ({alerts.length}/{MAX_ALERTS})
        </h2>
        {alerts.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-stone-200 bg-white/60 p-6 text-center text-sm text-stone-500">
            Aún no tienes alertas. Crea la primera abajo o desde cualquier búsqueda.
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Card className="flex items-center gap-4 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                    {alert.species ? (
                      <SpeciesIcon species={alert.species} className="h-5 w-5" />
                    ) : (
                      <BellRing className="h-5 w-5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-900">{alertSummary(alert)}</p>
                    <p className="text-xs text-stone-500">Creada el {formatDate(alert.created_at)}</p>
                    <Link
                      href={alertSearchHref(alert)}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden />
                      Ver resultados
                    </Link>
                  </div>
                  <form action={deleteAlert}>
                    <input type="hidden" name="id" value={alert.id} />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar alerta: ${alertSummary(alert)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-extrabold">Nueva alerta</h2>
        {full ? (
          <Alert variant="info">
            Llegaste al máximo de {MAX_ALERTS} alertas. Elimina alguna para crear otra.
          </Alert>
        ) : (
          <NewAlertForm defaultRegion={getCommune(profile.commune_code)?.regionCode} />
        )}
      </Card>
    </Container>
  );
}
