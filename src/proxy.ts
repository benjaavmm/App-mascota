import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

// Rutas que requieren sesión iniciada.
const PROTECTED = [
  /^\/publicar/,
  /^\/mis-publicaciones/,
  /^\/solicitudes/,
  /^\/mensajes/,
  /^\/seguimientos/,
  /^\/favoritos/,
  /^\/alertas/,
  /^\/notificaciones/,
  /^\/perfil/,
  /^\/bienvenida/,
  /^\/admin/,
  /^\/nueva-clave/,
  /^\/mascotas\/[^/]+\/postular/,
];

// Rutas solo para visitantes sin sesión.
const GUEST_ONLY = [/^\/ingresar/, /^\/registro/];

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = SUPABASE_URL ? new URL(SUPABASE_URL) : null;
  const supabaseHttp = supabase ? supabase.origin : "";
  const supabaseWs = supabase ? `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}` : "";

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${supabaseHttp}`,
    `font-src 'self'`,
    `connect-src 'self' ${supabaseHttp} ${supabaseWs}`,
    `media-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];
  if (!isDev && supabase?.protocol === "https:") {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Reenvía la petición con el nonce (Next.js lo aplica a sus scripts) y las cookies actualizadas.
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers } });
  };

  let response = forward();

  if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    });

    // Valida el JWT y refresca la sesión si expiró. No agregues lógica entre
    // createServerClient y esta llamada.
    const { data } = await supabase.auth.getClaims();
    const isSignedIn = Boolean(data?.claims?.sub);
    const { pathname, search } = request.nextUrl;

    let redirectTo: URL | null = null;
    if (!isSignedIn && PROTECTED.some((re) => re.test(pathname))) {
      redirectTo = new URL("/ingresar", request.url);
      redirectTo.searchParams.set("next", pathname + search);
    } else if (isSignedIn && GUEST_ONLY.some((re) => re.test(pathname))) {
      redirectTo = new URL("/", request.url);
    }

    if (redirectTo) {
      const redirect = NextResponse.redirect(redirectTo);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      response = redirect;
    }
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
