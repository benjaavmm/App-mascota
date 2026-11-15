import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdoptionFormEditor } from "@/components/forms/adoption-form-editor";
import { Container, PageHeader } from "@/components/ui/card";
import { getOwnerForm } from "@/lib/adoption-form";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi formulario de adopción" };

export default async function AdoptionFormPage() {
  const profile = await requireProfile("/mis-publicaciones/formulario");
  const supabase = await createClient();
  const form = await getOwnerForm(supabase, profile.id);

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <Link
        href="/mis-publicaciones"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis publicaciones
      </Link>
      <PageHeader
        title="Mi formulario de adopción"
        description="Elige cómo postulan las personas a tus mascotas en adopción: con el cuestionario de AyudaPatitas (y tus propias preguntas) o con tu propio formulario."
      />
      <AdoptionFormEditor initial={form} />
    </Container>
  );
}
