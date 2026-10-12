import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetRequestForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <AuthShell
      title="Recupera tu contraseña"
      description="Te enviaremos un enlace para crear una nueva."
      footer={
        <Link href="/ingresar" className="font-bold text-brand-700 hover:underline">
          Volver a ingresar
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
