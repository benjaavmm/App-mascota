import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/mascotas", "/adoptados", "/usuarios/", "/seguridad", "/adopcion-responsable"],
      disallow: [
        "/admin",
        "/mensajes",
        "/solicitudes",
        "/seguimientos",
        "/perfil",
        "/favoritos",
        "/notificaciones",
        "/mis-publicaciones",
        "/auth",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
