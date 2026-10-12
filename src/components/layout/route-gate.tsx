"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Oculta su contenido en rutas de pantalla completa (por ejemplo, una conversación).
export function HideOnFullscreenRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (/^\/mensajes\/[^/]+/.test(pathname)) return null;
  return <>{children}</>;
}
