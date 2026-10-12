-- =============================================================================
-- Huellitas · Migración base
-- Extensiones, tipos, geografía de Chile, perfiles, notificaciones, bloqueos,
-- auditoría y funciones auxiliares de seguridad.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.account_type as enum ('person', 'rescuer', 'shelter');
create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.account_status as enum ('active', 'suspended', 'banned');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

-- -----------------------------------------------------------------------------
-- Utilidades genéricas
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normaliza texto para búsquedas: minúsculas y sin tildes.
create function public.normalize_text(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
$$;

-- Limpia caracteres de control de un texto libre (deja saltos de línea).
create function public.clean_text(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(btrim(regexp_replace(p_text, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), '');
$$;

-- -----------------------------------------------------------------------------
-- Geografía: regiones y comunas de Chile (CUT)
-- -----------------------------------------------------------------------------
create table public.regions (
  code text primary key check (code ~ '^[0-9]{2}$'),
  name text not null,
  short_name text not null,
  sort_order smallint not null
);

create table public.communes (
  code text primary key check (code ~ '^[0-9]{5}$'),
  name text not null,
  region_code text not null references public.regions (code)
);

create index communes_region_code_idx on public.communes (region_code);

alter table public.regions enable row level security;
alter table public.communes enable row level security;

create policy "Regiones visibles para todos" on public.regions
  for select to anon, authenticated using (true);
create policy "Comunas visibles para todos" on public.communes
  for select to anon, authenticated using (true);

revoke all on public.regions, public.communes from anon, authenticated;
grant select on public.regions, public.communes to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Perfiles públicos
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  bio text check (bio is null or char_length(bio) <= 600),
  account_type public.account_type not null default 'person',
  commune_code text references public.communes (code),
  website_url text check (
    website_url is null
    or (char_length(website_url) <= 200 and website_url ~* '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s]*)?$')
  ),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  terms_accepted_at timestamptz,
  adult_confirmed_at timestamptz,
  -- Campos protegidos: solo se modifican mediante funciones de moderación.
  role public.user_role not null default 'user',
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  account_status public.account_status not null default 'active',
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Datos públicos de cada persona usuaria. Los datos privados (teléfono) viven en profile_private.';

create index profiles_commune_code_idx on public.profiles (commune_code);
create index profiles_role_idx on public.profiles (role) where role <> 'user';

-- Datos privados: solo visibles para la propia persona (y moderación).
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+?[0-9][0-9 ]{7,15}$'),
  updated_at timestamptz not null default now()
);

comment on table public.profile_private is
  'Datos de contacto privados. Solo se comparten cuando la persona lo autoriza en una conversación.';

-- -----------------------------------------------------------------------------
-- Funciones auxiliares de seguridad (usadas por RLS)
-- -----------------------------------------------------------------------------
create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('moderator', 'admin')
      and p.account_status = 'active'
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.account_status = 'active'
  );
$$;

-- Una cuenta está activa si no está baneada ni con una suspensión vigente.
create function public.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (
        p.account_status = 'active'
        or (p.account_status = 'suspended' and p.suspended_until is not null and p.suspended_until <= now())
      )
  );
$$;

-- Perfil completo: nombre, comuna, términos aceptados y mayoría de edad declarada.
create function public.is_onboarded(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.commune_code is not null
      and p.terms_accepted_at is not null
      and p.adult_confirmed_at is not null
  );
$$;

-- Lanza un error si la persona que llama no puede realizar acciones.
create function public.assert_can_act()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '28000';
  end if;
  if not public.is_active_user(v_uid) then
    raise exception 'Tu cuenta está suspendida. Revisa tus notificaciones o escríbenos.' using errcode = '42501';
  end if;
  if not public.is_onboarded(v_uid) then
    raise exception 'Completa tu perfil (comuna y términos) antes de continuar.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Creación automática del perfil al registrarse
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(public.clean_text(new.raw_user_meta_data ->> 'display_name'), ''), 60);
begin
  if char_length(v_name) < 2 then
    v_name := 'Persona ' || left(new.id::text, 6);
  end if;

  insert into public.profiles (id, display_name) values (new.id, v_name);
  insert into public.profile_private (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reglas al editar el perfil propio.
create function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.display_name := public.clean_text(new.display_name);
  new.bio := public.clean_text(new.bio);

  -- Las fechas de aceptación las fija el servidor, no el cliente.
  if new.terms_accepted_at is distinct from old.terms_accepted_at then
    new.terms_accepted_at := case when new.terms_accepted_at is null then null else now() end;
  end if;
  if new.adult_confirmed_at is distinct from old.adult_confirmed_at then
    new.adult_confirmed_at := case when new.adult_confirmed_at is null then null else now() end;
  end if;

  -- Cambiar el tipo de cuenta anula la verificación previa.
  if new.account_type is distinct from old.account_type
     and old.verification_status = 'verified'
     and new.verification_status = 'verified' then
    new.verification_status := 'unverified';
    new.verified_at := null;
  end if;

  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

create policy "Perfiles públicos visibles para todos" on public.profiles
  for select to anon, authenticated using (true);
create policy "Cada persona edita su perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Datos privados: solo la propia persona o moderación" on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));
create policy "Datos privados: solo la propia persona edita" on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Privilegios por columna: los campos protegidos no se pueden editar desde el cliente.
revoke all on public.profiles, public.profile_private from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (
  display_name, avatar_path, bio, account_type, commune_code,
  website_url, instagram, terms_accepted_at, adult_confirmed_at
) on public.profiles to authenticated;
grant select on public.profile_private to authenticated;
grant update (phone) on public.profile_private to authenticated;

-- -----------------------------------------------------------------------------
-- Notificaciones dentro de la app
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text check (link is null or link ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "Ver mis notificaciones" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Marcar mis notificaciones" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Borrar mis notificaciones" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Uso interno: crea una notificación.
create function public.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, left(p_title, 140), left(p_body, 400), p_link);
end;
$$;

-- Uso interno: notifica a todo el equipo de moderación.
create function public.notify_moderators(p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, p_type, left(p_title, 140), left(p_body, 400), p_link
  from public.profiles p
  where p.role in ('moderator', 'admin') and p.account_status = 'active';
end;
$$;

-- -----------------------------------------------------------------------------
-- Bloqueos entre personas
-- -----------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "Ver a quién bloqueé" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "Bloquear a alguien" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "Desbloquear" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

revoke all on public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;

-- Uso interno: ¿alguna de las dos personas bloqueó a la otra?
create function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- -----------------------------------------------------------------------------
-- Registro de auditoría de moderación
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "Moderación ve la auditoría" on public.audit_log
  for select to authenticated using ((select public.is_moderator()));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create function public.log_action(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;
