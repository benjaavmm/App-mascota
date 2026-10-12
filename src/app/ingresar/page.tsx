import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Alert } from "@/components/ui/alert";
import { safeNext } from "@/lib/auth";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Ingresar" };

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = safeNext(firstParam(params.next), "/");
  const linkError = firstParam(params.error) === "enlace";

  return (
    <AuthShell
      title="¡Hola de nuevo!"
      description="Ingresa para adoptar, publicar y conversar de forma segura."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href={`/registro${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-brand-700 hover:underline">
            Crea una gratis
          </Link>
        </>
      }
    >
      {linkError && (
        <Alert variant="warning" className="mb-4">
          El enlace no es válido o ya expiró. Ingresa o solicita uno nuevo.
        </Alert>
      )}
      <SignInForm next={next} />
    </AuthShell>
  );
}
