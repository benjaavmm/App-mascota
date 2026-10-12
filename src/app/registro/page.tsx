import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Únete a Huellitas"
      description="Crea tu cuenta gratis para adoptar, publicar y ayudar a animales que necesitan un hogar."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/ingresar" className="font-bold text-brand-700 hover:underline">
            Ingresa aquí
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
