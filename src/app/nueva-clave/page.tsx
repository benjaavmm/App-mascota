import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/simple-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  await requireUser("/nueva-clave");
  return (
    <AuthShell title="Crea una nueva contraseña" description="Elige una contraseña segura que no uses en otros sitios.">
      <NewPasswordForm />
    </AuthShell>
  );
}
