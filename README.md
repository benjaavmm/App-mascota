# 🐾 Huellitas — Adopción responsable de perritos de la calle

Aplicación web (instalable en el celular como app) para **adoptar, publicar y reencontrar perritos** en todo Chile, con foco en la **seguridad de las personas y de los perritos**.

Construida con **Next.js 16 + TypeScript + Tailwind CSS 4** y **Supabase** (Postgres, Auth, Storage y Realtime). Toda la interfaz está en español de Chile.

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Seguridad](#seguridad)
3. [Tecnologías y estructura](#tecnologías-y-estructura)
4. [Puesta en marcha local](#puesta-en-marcha-local)
5. [Configurar Supabase en la nube (producción)](#configurar-supabase-en-la-nube-producción)
6. [Desplegar la app (Vercel)](#desplegar-la-app-vercel)
7. [Modelo de datos](#modelo-de-datos)
8. [Pruebas](#pruebas)
9. [Scripts](#scripts)
10. [Próximos pasos sugeridos](#próximos-pasos-sugeridos)

---

## Funcionalidades

### Para todas las personas
- **Búsqueda de perritos** en adopción, **perdidos** y **encontrados**, con filtros por región/comuna (las 16 regiones y 346 comunas de Chile), tamaño, sexo, edad, esterilización, compatibilidad con niños/perros/gatos y casos urgentes. Búsqueda de texto que ignora tildes (“ñuñoa” = “Ñuñoa”).
- **Ficha completa de cada perrito**: galería de fotos, salud (vacunas, desparasitación, esterilización, microchip), personalidad, requisitos y datos de quien publica (con insignia de verificación y número de adopciones logradas).
- **Finales felices**: perritos adoptados o que volvieron a casa.
- **Centro de seguridad** y **guía de adopción responsable** (incluye Ley N° 21.020 y cómo denunciar maltrato).
- **PWA**: se puede instalar en el celular; diseño “mobile first” con barra de navegación inferior.

### Para quienes publican (personas, rescatistas y fundaciones)
- Publicar perritos **en adopción, perdidos o encontrados** con hasta 8 fotos.
- Panel **Mis publicaciones**: editar, cambiar portada, pausar, archivar, marcar “adoptado” o “volvió a casa”.
- **Solicitudes recibidas** con todas las respuestas del cuestionario, historial de la persona postulante y acciones: *en revisión*, *aprobar*, *no aceptar* (con mensaje), *cancelar aprobación* y *confirmar adopción*.
- **Acta de adopción imprimible** (PDF desde el navegador) con los compromisos legales.
- **Seguimientos post‑adopción** automáticos: 1 semana, 1 mes, 3 meses y 6 meses.
- **Coincidencias perdidos/encontrados**: al publicar un perrito encontrado, se avisa a quienes buscan uno parecido en la misma región.
- **Verificación** de rescatistas y fundaciones (con documento de respaldo opcional y privado).

### Para quienes adoptan
- **Cuestionario de adopción responsable** (vivienda, familia, rutina, experiencia, motivación y compromisos obligatorios: veterinario, esterilización, seguimientos y no abandono).
- Estado de cada solicitud en tiempo real y notificaciones.
- Envío de seguimientos con foto privada.
- Favoritos.

### Comunicación
- **Chat interno en tiempo real** (Supabase Realtime), con historial, mensajes del sistema y contador de no leídos.
- **Contacto protegido**: el teléfono y el correo nunca se publican; cada persona decide si los comparte en una conversación.
- **Notificaciones** dentro de la app (solicitudes, mensajes, seguimientos, moderación, coincidencias).

### Moderación
- Panel con **resumen**, **reportes** (los de maltrato, venta de animales y estafas se marcan como urgentes), **verificaciones**, **publicaciones**, **usuarios** (suspender por días, bloquear, reactivar, cambiar rol) y **auditoría** de todas las acciones.

---

## Seguridad

La seguridad está implementada **en la base de datos**, no solo en la interfaz: aunque alguien llame directamente a la API de Supabase, las reglas se cumplen.

**Protección de personas**
- **Row Level Security (RLS)** en todas las tablas y **permisos por columna** (nadie puede auto‑asignarse un rol, verificarse, levantar una suspensión ni “des‑ocultar” una publicación).
- Datos privados separados (`profile_private`): el teléfono solo lo ve su dueño, o quien recibe el contacto cuando la persona decide compartirlo.
- Solo se muestra la **comuna**, nunca direcciones. Advertencias automáticas si alguien escribe un teléfono, correo o dirección en una publicación.
- Las fotos se **reducen y se les eliminan los metadatos EXIF/GPS en el navegador** antes de subirlas.
- **Detección de estafas** en el chat: mensajes que mencionan transferencias, depósitos, “cuenta RUT”, pagos o códigos de verificación quedan marcados y se muestra una advertencia a ambas partes (también antes de enviar).
- **Bloqueos** entre personas (impiden mensajes, contacto y postulaciones en ambos sentidos).
- **Reportes confidenciales** de publicaciones, personas y mensajes (se guarda una copia del mensaje reportado; moderación nunca lee conversaciones completas).
- **Ocultamiento automático** de publicaciones con 3 reportes de personas distintas, hasta que moderación las revise.
- **Límites anti‑spam** en la base de datos: publicaciones/día, publicaciones activas, solicitudes/día, solicitudes activas, mensajes/minuto, conversaciones nuevas/día y reportes/día.
- Cuentas **suspendidas o bloqueadas** no pueden publicar, postular ni escribir, y sus publicaciones dejan de verse.
- Mayoría de edad declarada y aceptación de términos obligatorias antes de interactuar.
- Eliminar la cuenta y cambiar la contraseña exigen la contraseña actual.

**Protección de los perritos**
- **Prohibida la venta**: normas explícitas, advertencias y motivo de reporte específico.
- Proceso de adopción ordenado (cuestionario → aprobación → acta → confirmación) controlado por una **máquina de estados en SQL**.
- Compromisos obligatorios y **seguimientos** con recordatorios diarios (pg_cron) y alertas por seguimientos atrasados.
- Reportes de **maltrato** priorizados e información sobre cómo denunciar a Carabineros (133), PDI (134), Fiscalía o municipalidad.

**Aplicación web**
- **Content Security Policy** estricta con *nonce* por petición, `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Validación en el servidor con **zod** en todas las Server Actions; redirecciones solo internas (sin *open redirects*).
- Errores de base de datos traducidos a mensajes seguros (no se filtran detalles internos).
- Enlaces de correo con `token_hash` (funcionan aunque se abran en otro dispositivo) y plantillas en español.
- Buckets de Storage con tipos y tamaños permitidos; documentos y fotos de seguimiento en **buckets privados** con URLs firmadas temporales.
- Funciones de base de datos con `security definer` + `search_path` vacío, y ejecución revocada por defecto (solo se habilitan las necesarias).

---

## Tecnologías y estructura

| Capa | Tecnología |
| --- | --- |
| Frontend y servidor | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript |
| Estilos | Tailwind CSS 4, íconos `lucide-react`, tipografía Nunito |
| Validación | zod 4 |
| Backend | Supabase: Postgres 17, Auth, Storage, Realtime, pg_cron |
| Pruebas | pgTAP (95 pruebas de seguridad), Playwright (flujo completo E2E) |

```
├── supabase/
│   ├── config.toml              # Configuración local (auth, plantillas, etc.)
│   ├── migrations/              # Esquema completo (tablas, RLS, funciones, storage, realtime)
│   ├── templates/               # Correos de autenticación en español
│   ├── tests/database/          # Pruebas pgTAP de seguridad y flujos
│   └── seed.sql                 # Datos de ejemplo (solo desarrollo)
├── src/
│   ├── proxy.ts                 # Sesión de Supabase, rutas protegidas y CSP con nonce
│   ├── actions/                 # Server Actions (auth, perfil, perritos, solicitudes, chat, seguridad, moderación)
│   ├── app/                     # Páginas (rutas en español: /perritos, /publicar, /solicitudes, /mensajes, /admin…)
│   ├── components/              # UI reutilizable y componentes por dominio
│   ├── lib/                     # Supabase, validaciones, utilidades, datos de Chile
│   └── types/database.ts        # Tipos generados desde la base de datos
└── e2e/                         # Pruebas end-to-end con Playwright
```

---

## Puesta en marcha local

**Requisitos:** Node.js 20+ y Docker (para Supabase local).

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar Supabase local (Postgres, Auth, Storage, Realtime, correo de pruebas)
npx supabase start

# 3. Crear el esquema y cargar datos de ejemplo
npx supabase db reset

# 4. Variables de entorno
cp .env.example .env.local
#   Copia en .env.local los valores que muestra `npx supabase status`:
#   API URL → NEXT_PUBLIC_SUPABASE_URL
#   Publishable key → NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#   Secret key → SUPABASE_SECRET_KEY

# 5. Iniciar la app
npm run dev
```

Abre http://localhost:3000.

**Cuentas de prueba** (contraseña `Huellitas2026`, solo en local):

| Correo | Rol |
| --- | --- |
| `admin@huellitas.test` | Administración (acceso a `/admin`) |
| `fundacion@huellitas.test` | Fundación verificada |
| `rescatista@huellitas.test` | Rescatista independiente |
| `adoptante@huellitas.test` | Persona que quiere adoptar |

Los correos (confirmación de cuenta, recuperar contraseña) llegan a **Mailpit**: http://127.0.0.1:54324.

---

## Configurar Supabase en la nube (producción)

1. **Crea un proyecto** en https://supabase.com (región sugerida: São Paulo, `sa-east-1`, la más cercana a Chile).

2. **Aplica el esquema** con la CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push
   ```
   Esto crea tablas, políticas RLS, funciones, buckets de Storage, la publicación de Realtime y la tarea diaria de pg_cron.
   > ⚠️ No ejecutes `supabase/seed.sql` en producción.

   *Alternativa sin CLI:* copia el contenido de cada archivo de `supabase/migrations/` (en orden) en **SQL Editor** y ejecútalo.

3. **Autenticación** (Dashboard → Authentication):
   - **URL Configuration** → *Site URL*: `https://tu-dominio.cl`. *Redirect URLs*: `https://tu-dominio.cl/**` (y `http://localhost:3000/**` para desarrollo).
   - **Sign In / Providers → Email**: activa **Confirm email**. Contraseña mínima **8** caracteres con letras y números. Activa **Secure password change**.
   - **Attack Protection**: activa **Leaked password protection** (si tu plan lo permite) y, recomendado, **CAPTCHA** (hCaptcha o Turnstile).
   - **Emails → Templates**: copia el contenido de `supabase/templates/confirmation.html`, `recovery.html`, `email_change.html` y `magic_link.html` en las plantillas correspondientes (usan `token_hash`, necesario para que los enlaces funcionen).
   - **Emails → SMTP Settings**: configura un SMTP propio (Resend, Brevo, SendGrid…). El SMTP de prueba de Supabase tiene un límite muy bajo de correos por hora.

4. **pg_cron** (recordatorios de seguimientos): la migración intenta activarlo automáticamente. Si no quedó activo, ve a **Database → Extensions**, activa `pg_cron` y ejecuta:
   ```sql
   select cron.schedule('huellitas-seguimientos', '0 13 * * *', 'select public.notify_due_followups()');
   ```

5. **Crea la primera cuenta de administración**: regístrate en la app y luego, en **SQL Editor**:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.cl');
   ```
   Desde el panel `/admin` → Usuarios podrás nombrar a más moderadores.

6. **Claves**: en **Project Settings → API Keys** copia la *Publishable key* y la *Secret key*. La secret key solo va en el servidor (se usa para que una persona pueda eliminar su cuenta).

---

## Desplegar la app (Vercel)

1. Importa el repositorio en https://vercel.com.
2. Agrega las variables de entorno:

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://TU_PROJECT_REF.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
   | `NEXT_PUBLIC_SITE_URL` | `https://tu-dominio.cl` |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` (**sin** prefijo `NEXT_PUBLIC_`) |

3. Despliega y actualiza la *Site URL* de Supabase con tu dominio final.

---

## Modelo de datos

| Tabla | Para qué sirve |
| --- | --- |
| `regions`, `communes` | Regiones y comunas de Chile (Código Único Territorial). |
| `profiles` | Perfil público: nombre, comuna, tipo de cuenta, verificación, rol y estado (campos protegidos). |
| `profile_private` | Teléfono (privado). |
| `dogs`, `dog_photos` | Publicaciones (adopción, perdido, encontrado) y sus fotos. |
| `favorites` | Perritos guardados. |
| `applications` | Solicitudes de adopción con el cuestionario. |
| `followups` | Seguimientos post‑adopción. |
| `conversations`, `messages` | Chat interno y consentimiento para compartir contacto. |
| `blocks` | Bloqueos entre personas. |
| `reports` | Reportes de publicaciones, personas y mensajes. |
| `verification_requests` | Solicitudes de verificación de rescatistas y fundaciones. |
| `notifications` | Notificaciones dentro de la app. |
| `audit_log` | Registro de acciones de moderación. |

**Flujo de una solicitud de adopción** (controlado por funciones SQL):

```
pendiente ──► en revisión ──► aprobada ──► adopción concretada ──► seguimientos (1 sem, 1, 3 y 6 meses)
    │              │              │
    └──────────────┴──► no aceptada / retirada / cerrada / cancelada
```

Al aprobar, el perrito pasa a “en proceso” y no recibe nuevas solicitudes. Al concretar la adopción, el resto de las solicitudes se cierran y se avisa a cada postulante.

**Buckets de Storage**

| Bucket | Acceso | Límite |
| --- | --- | --- |
| `avatars` | Público | 2 MB |
| `dog-photos` | Público | 5 MB |
| `followup-photos` | Privado (adoptante y quien entregó) | 5 MB |
| `verification-docs` | Privado (dueño y moderación) | 10 MB |

---

## Pruebas

```bash
# Pruebas de seguridad de la base de datos (RLS, permisos, flujos) — 95 pruebas pgTAP
npm run db:test

# Pruebas end-to-end con navegador (requiere Supabase local con `db reset` y la app corriendo o se inicia sola)
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

La prueba E2E recorre el flujo completo: registro con confirmación por correo → bienvenida → una fundación publica con foto → búsqueda sin tildes → postulación → chat en tiempo real con advertencia de estafa → aprobación → acta → adopción concretada → seguimiento con foto privada → reporte → moderación y auditoría. También verifica rutas protegidas y que la CSP no bloquee la app.

GitHub Actions (`.github/workflows/ci.yml`) ejecuta lint, verificación de tipos, build y las pruebas de base de datos en cada *pull request*.

---

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos |
| `npm run db:start` / `db:stop` | Levantar / detener Supabase local |
| `npm run db:reset` | Recrear la base local con migraciones y datos de ejemplo |
| `npm run db:test` | Pruebas pgTAP |
| `npm run db:types` | Regenerar `src/types/database.ts` desde la base local |
| `npm run test:e2e` | Pruebas Playwright |

---

## Próximos pasos sugeridos

- Notificaciones por correo o push (por ejemplo, con Supabase Edge Functions + Resend).
- Mapa de avistamientos para perdidos/encontrados con ubicación aproximada.
- Alertas guardadas (“avísame cuando publiquen un perrito pequeño en Ñuñoa”).
- CAPTCHA en registro e ingreso (Turnstile) y MFA para cuentas de moderación.
- App móvil nativa (React Native/Expo) reutilizando el mismo backend de Supabase.

> **Aviso:** los textos de *Términos* y *Privacidad* son una base. Si vas a operar la plataforma públicamente, revísalos con asesoría legal.
