import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";

import { BottomNav } from "@/components/layout/bottom-nav";
import { HideOnFullscreenRoutes } from "@/components/layout/route-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { UnreadProvider } from "@/components/layout/unread-provider";
import { getCurrentProfile, isAccountActive, isModerator } from "@/lib/auth";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} · ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: APP_NAME,
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
};

async function getUnreadCounts(signedIn: boolean) {
  if (!signedIn) return { notifications: 0, messages: 0 };
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_unread_counts");
  const counts = (data ?? {}) as { notifications?: number; messages?: number };
  return { notifications: Number(counts.notifications) || 0, messages: Number(counts.messages) || 0 };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();
  const counts = await getUnreadCounts(Boolean(profile));
  const moderator = isModerator(profile);

  return (
    <html lang="es-CL" className={`${nunito.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
        >
          Saltar al contenido
        </a>
        <UnreadProvider userId={profile?.id ?? null} initial={counts}>
          <SiteHeader profile={profile} isModerator={moderator} />
          {profile && !isAccountActive(profile) && (
            <div role="alert" className="no-print bg-rose-600 px-4 py-2 text-center text-sm font-bold text-white">
              Tu cuenta está {profile.account_status === "banned" ? "bloqueada" : "suspendida"}. Puedes navegar, pero no
              publicar, postular ni enviar mensajes. Revisa tus notificaciones.
            </div>
          )}
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <HideOnFullscreenRoutes>
            <SiteFooter />
          </HideOnFullscreenRoutes>
          {profile && <BottomNav />}
        </UnreadProvider>
      </body>
    </html>
  );
}
