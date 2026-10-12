import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/admin-nav";
import { Container } from "@/components/ui/card";
import { requireModerator } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Moderación", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireModerator();
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">Panel de moderación</h1>
          <p className="text-sm text-stone-500">
            {profile.display_name} · {ROLE_LABELS[profile.role]}. Todas las acciones quedan registradas.
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
