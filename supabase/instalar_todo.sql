-- =============================================================================
-- AyudaPatitas · Instalación completa para un proyecto NUEVO de Supabase
-- Pega todo este archivo en Supabase → SQL Editor → New query y toca Run.
-- Es la unión, en orden, de los archivos de supabase/migrations (generado con
-- npm run db:bundle). No incluye datos de ejemplo.
-- =============================================================================

-- >>> 20261012000100_base.sql
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

-- >>> 20261012000110_geo_data.sql
-- Regiones y comunas de Chile (Código Único Territorial). Fuente: @clregions/data (MIT).
insert into public.regions (code, name, short_name, sort_order) values
  ('15', 'Región de Arica y Parinacota', 'Arica y Parinacota', 1),
  ('01', 'Región de Tarapacá', 'Tarapacá', 2),
  ('02', 'Región de Antofagasta', 'Antofagasta', 3),
  ('03', 'Región de Atacama', 'Atacama', 4),
  ('04', 'Región de Coquimbo', 'Coquimbo', 5),
  ('05', 'Región de Valparaíso', 'Valparaíso', 6),
  ('13', 'Región Metropolitana de Santiago', 'Metropolitana', 7),
  ('06', 'Región del Libertador General Bernardo O''Higgins', 'O''Higgins', 8),
  ('07', 'Región del Maule', 'Maule', 9),
  ('16', 'Región de Ñuble', 'Ñuble', 10),
  ('08', 'Región del Biobío', 'Biobío', 11),
  ('09', 'Región de La Araucanía', 'La Araucanía', 12),
  ('14', 'Región de Los Ríos', 'Los Ríos', 13),
  ('10', 'Región de Los Lagos', 'Los Lagos', 14),
  ('11', 'Región Aysén del General Carlos Ibáñez del Campo', 'Aysén', 15),
  ('12', 'Región de Magallanes y de la Antártica Chilena', 'Magallanes', 16);

insert into public.communes (code, name, region_code) values
  ('05602', 'Algarrobo', '05'),
  ('13502', 'Alhué', '13'),
  ('08314', 'Alto Biobío', '08'),
  ('03302', 'Alto del Carmen', '03'),
  ('01107', 'Alto Hospicio', '01'),
  ('10202', 'Ancud', '10'),
  ('04103', 'Andacollo', '04'),
  ('09201', 'Angol', '09'),
  ('12202', 'Antártica', '12'),
  ('02101', 'Antofagasta', '02'),
  ('08302', 'Antuco', '08'),
  ('08202', 'Arauco', '08'),
  ('15101', 'Arica', '15'),
  ('11201', 'Aysén', '11'),
  ('13402', 'Buin', '13'),
  ('16102', 'Bulnes', '16'),
  ('05402', 'Cabildo', '05'),
  ('12201', 'Cabo de Hornos', '12'),
  ('08303', 'Cabrero', '08'),
  ('02201', 'Calama', '02'),
  ('10102', 'Calbuco', '10'),
  ('03102', 'Caldera', '03'),
  ('05502', 'Calera', '05'),
  ('13403', 'Calera de Tango', '13'),
  ('05302', 'Calle Larga', '05'),
  ('15102', 'Camarones', '15'),
  ('01402', 'Camiña', '01'),
  ('04202', 'Canela', '04'),
  ('08203', 'Cañete', '08'),
  ('09102', 'Carahue', '09'),
  ('05603', 'Cartagena', '05'),
  ('05102', 'Casablanca', '05'),
  ('10201', 'Castro', '10'),
  ('05702', 'Catemu', '05'),
  ('07201', 'Cauquenes', '07'),
  ('13102', 'Cerrillos', '13'),
  ('13103', 'Cerro Navia', '13'),
  ('10401', 'Chaitén', '10'),
  ('07202', 'Chanco', '07'),
  ('03201', 'Chañaral', '03'),
  ('06302', 'Chépica', '06'),
  ('08103', 'Chiguayante', '08'),
  ('11401', 'Chile Chico', '11'),
  ('16101', 'Chillán', '16'),
  ('16103', 'Chillán Viejo', '16'),
  ('06303', 'Chimbarongo', '06'),
  ('09121', 'Cholchol', '09'),
  ('10203', 'Chonchi', '10'),
  ('11202', 'Cisnes', '11'),
  ('16202', 'Cobquecura', '16'),
  ('10103', 'Cochamó', '10'),
  ('11301', 'Cochrane', '11'),
  ('06102', 'Codegua', '06'),
  ('16203', 'Coelemu', '16'),
  ('16302', 'Coihueco', '16'),
  ('06103', 'Coinco', '06'),
  ('07402', 'Colbún', '07'),
  ('01403', 'Colchane', '01'),
  ('13301', 'Colina', '13'),
  ('09202', 'Collipulli', '09'),
  ('06104', 'Coltauco', '06'),
  ('04302', 'Combarbalá', '04'),
  ('08101', 'Concepción', '08'),
  ('13104', 'Conchalí', '13'),
  ('05103', 'Concón', '05'),
  ('07102', 'Constitución', '07'),
  ('08204', 'Contulmo', '08'),
  ('03101', 'Copiapó', '03'),
  ('04102', 'Coquimbo', '04'),
  ('08102', 'Coronel', '08'),
  ('14102', 'Corral', '14'),
  ('11101', 'Coyhaique', '11'),
  ('09103', 'Cunco', '09'),
  ('09203', 'Curacautín', '09'),
  ('13503', 'Curacaví', '13'),
  ('10204', 'Curaco de Vélez', '10'),
  ('08205', 'Curanilahue', '08'),
  ('09104', 'Curarrehue', '09'),
  ('07103', 'Curepto', '07'),
  ('07301', 'Curicó', '07'),
  ('10205', 'Dalcahue', '10'),
  ('03202', 'Diego de Almagro', '03'),
  ('06105', 'Doñihue', '06'),
  ('13105', 'El Bosque', '13'),
  ('16104', 'El Carmen', '16'),
  ('13602', 'El Monte', '13'),
  ('05604', 'El Quisco', '05'),
  ('05605', 'El Tabo', '05'),
  ('07104', 'Empedrado', '07'),
  ('09204', 'Ercilla', '09'),
  ('13106', 'Estación Central', '13'),
  ('08104', 'Florida', '08'),
  ('09105', 'Freire', '09'),
  ('03303', 'Freirina', '03'),
  ('10104', 'Fresia', '10'),
  ('10105', 'Frutillar', '10'),
  ('10402', 'Futaleufú', '10'),
  ('14202', 'Futrono', '14'),
  ('09106', 'Galvarino', '09'),
  ('15202', 'General Lagos', '15'),
  ('09107', 'Gorbea', '09'),
  ('06106', 'Graneros', '06'),
  ('11203', 'Guaitecas', '11'),
  ('05503', 'Hijuelas', '05'),
  ('10403', 'Hualaihué', '10'),
  ('07302', 'Hualañé', '07'),
  ('08112', 'Hualpén', '08'),
  ('08105', 'Hualqui', '08'),
  ('01404', 'Huara', '01'),
  ('03304', 'Huasco', '03'),
  ('13107', 'Huechuraba', '13'),
  ('04201', 'Illapel', '04'),
  ('13108', 'Independencia', '13'),
  ('01101', 'Iquique', '01'),
  ('13603', 'Isla de Maipo', '13'),
  ('05201', 'Isla de Pascua', '05'),
  ('05104', 'Juan Fernández', '05'),
  ('13109', 'La Cisterna', '13'),
  ('05504', 'La Cruz', '05'),
  ('06202', 'La Estrella', '06'),
  ('13110', 'La Florida', '13'),
  ('13111', 'La Granja', '13'),
  ('04104', 'La Higuera', '04'),
  ('05401', 'La Ligua', '05'),
  ('13112', 'La Pintana', '13'),
  ('13113', 'La Reina', '13'),
  ('04101', 'La Serena', '04'),
  ('14201', 'La Unión', '14'),
  ('14203', 'Lago Ranco', '14'),
  ('11102', 'Lago Verde', '11'),
  ('12102', 'Laguna Blanca', '12'),
  ('08304', 'Laja', '08'),
  ('13302', 'Lampa', '13'),
  ('14103', 'Lanco', '14'),
  ('06107', 'Las Cabras', '06'),
  ('13114', 'Las Condes', '13'),
  ('09108', 'Lautaro', '09'),
  ('08201', 'Lebu', '08'),
  ('07303', 'Licantén', '07'),
  ('05802', 'Limache', '05'),
  ('07401', 'Linares', '07'),
  ('06203', 'Litueche', '06'),
  ('05703', 'Llaillay', '05'),
  ('10107', 'Llanquihue', '10'),
  ('13115', 'Lo Barnechea', '13'),
  ('13116', 'Lo Espejo', '13'),
  ('13117', 'Lo Prado', '13'),
  ('06304', 'Lolol', '06'),
  ('09109', 'Loncoche', '09'),
  ('07403', 'Longaví', '07'),
  ('09205', 'Lonquimay', '09'),
  ('08206', 'Los Alamos', '08'),
  ('05301', 'Los Andes', '05'),
  ('08301', 'Los Angeles', '08'),
  ('14104', 'Los Lagos', '14'),
  ('10106', 'Los Muermos', '10'),
  ('09206', 'Los Sauces', '09'),
  ('04203', 'Los Vilos', '04'),
  ('08106', 'Lota', '08'),
  ('09207', 'Lumaco', '09'),
  ('06108', 'Machalí', '06'),
  ('13118', 'Macul', '13'),
  ('14105', 'Máfil', '14'),
  ('13119', 'Maipú', '13'),
  ('06109', 'Malloa', '06'),
  ('06204', 'Marchihue', '06'),
  ('02302', 'María Elena', '02'),
  ('13504', 'María Pinto', '13'),
  ('14106', 'Mariquina', '14'),
  ('07105', 'Maule', '07'),
  ('10108', 'Maullín', '10'),
  ('02102', 'Mejillones', '02'),
  ('09110', 'Melipeuco', '09'),
  ('13501', 'Melipilla', '13'),
  ('07304', 'Molina', '07'),
  ('04303', 'Monte Patria', '04'),
  ('06110', 'Mostazal', '06'),
  ('08305', 'Mulchén', '08'),
  ('08306', 'Nacimiento', '08'),
  ('06305', 'Nancagua', '06'),
  ('12401', 'Natales', '12'),
  ('06205', 'Navidad', '06'),
  ('08307', 'Negrete', '08'),
  ('16204', 'Ninhue', '16'),
  ('05506', 'Nogales', '05'),
  ('09111', 'Nueva Imperial', '09'),
  ('16303', 'Ñiquén', '16'),
  ('13120', 'Ñuñoa', '13'),
  ('11302', 'O''Higgins', '11'),
  ('06111', 'Olivar', '06'),
  ('02202', 'Ollagüe', '02'),
  ('05803', 'Olmué', '05'),
  ('10301', 'Osorno', '10'),
  ('04301', 'Ovalle', '04'),
  ('13604', 'Padre Hurtado', '13'),
  ('09112', 'Padre Las Casas', '09'),
  ('04105', 'Paiguano', '04'),
  ('14107', 'Paillaco', '14'),
  ('13404', 'Paine', '13'),
  ('10404', 'Palena', '10'),
  ('06306', 'Palmilla', '06'),
  ('14108', 'Panguipulli', '14'),
  ('05704', 'Panquehue', '05'),
  ('05403', 'Papudo', '05'),
  ('06206', 'Paredones', '06'),
  ('07404', 'Parral', '07'),
  ('13121', 'Pedro Aguirre Cerda', '13'),
  ('07106', 'Pelarco', '07'),
  ('07203', 'Pelluhue', '07'),
  ('16105', 'Pemuco', '16'),
  ('07107', 'Pencahue', '07'),
  ('08107', 'Penco', '08'),
  ('13605', 'Peñaflor', '13'),
  ('13122', 'Peñalolén', '13'),
  ('06307', 'Peralillo', '06'),
  ('09113', 'Perquenco', '09'),
  ('05404', 'Petorca', '05'),
  ('06112', 'Peumo', '06'),
  ('01405', 'Pica', '01'),
  ('06113', 'Pichidegua', '06'),
  ('06201', 'Pichilemu', '06'),
  ('16106', 'Pinto', '16'),
  ('13202', 'Pirque', '13'),
  ('09114', 'Pitrufquén', '09'),
  ('06308', 'Placilla', '06'),
  ('16205', 'Portezuelo', '16'),
  ('12301', 'Porvenir', '12'),
  ('01401', 'Pozo Almonte', '01'),
  ('12302', 'Primavera', '12'),
  ('13123', 'Providencia', '13'),
  ('05105', 'Puchuncaví', '05'),
  ('09115', 'Pucón', '09'),
  ('13124', 'Pudahuel', '13'),
  ('13201', 'Puente Alto', '13'),
  ('10101', 'Puerto Montt', '10'),
  ('10302', 'Puerto Octay', '10'),
  ('10109', 'Puerto Varas', '10'),
  ('06309', 'Pumanque', '06'),
  ('04304', 'Punitaqui', '04'),
  ('12101', 'Punta Arenas', '12'),
  ('10206', 'Puqueldón', '10'),
  ('09208', 'Purén', '09'),
  ('10303', 'Purranque', '10'),
  ('05705', 'Putaendo', '05'),
  ('15201', 'Putre', '15'),
  ('10304', 'Puyehue', '10'),
  ('10207', 'Queilén', '10'),
  ('10208', 'Quellón', '10'),
  ('10209', 'Quemchi', '10'),
  ('08308', 'Quilaco', '08'),
  ('13125', 'Quilicura', '13'),
  ('08309', 'Quilleco', '08'),
  ('16107', 'Quillón', '16'),
  ('05501', 'Quillota', '05'),
  ('05801', 'Quilpué', '05'),
  ('10210', 'Quinchao', '10'),
  ('06114', 'Quinta de Tilcoco', '06'),
  ('13126', 'Quinta Normal', '13'),
  ('05107', 'Quintero', '05'),
  ('16201', 'Quirihue', '16'),
  ('06101', 'Rancagua', '06'),
  ('16206', 'Ranquil', '16'),
  ('07305', 'Rauco', '07'),
  ('13127', 'Recoleta', '13'),
  ('09209', 'Renaico', '09'),
  ('13128', 'Renca', '13'),
  ('06115', 'Rengo', '06'),
  ('06116', 'Requínoa', '06'),
  ('07405', 'Retiro', '07'),
  ('05303', 'Rinconada', '05'),
  ('14204', 'Río Bueno', '14'),
  ('07108', 'Río Claro', '07'),
  ('04305', 'Río Hurtado', '04'),
  ('11402', 'Río Ibáñez', '11'),
  ('10305', 'Río Negro', '10'),
  ('12103', 'Río Verde', '12'),
  ('07306', 'Romeral', '07'),
  ('09116', 'Saavedra', '09'),
  ('07307', 'Sagrada Familia', '07'),
  ('04204', 'Salamanca', '04'),
  ('05601', 'San Antonio', '05'),
  ('13401', 'San Bernardo', '13'),
  ('16301', 'San Carlos', '16'),
  ('07109', 'San Clemente', '07'),
  ('05304', 'San Esteban', '05'),
  ('16304', 'San Fabián', '16'),
  ('05701', 'San Felipe', '05'),
  ('06301', 'San Fernando', '06'),
  ('12104', 'San Gregorio', '12'),
  ('16108', 'San Ignacio', '16'),
  ('07406', 'San Javier', '07'),
  ('13129', 'San Joaquín', '13'),
  ('13203', 'San José de Maipo', '13'),
  ('10306', 'San Juan de la Costa', '10'),
  ('13130', 'San Miguel', '13'),
  ('16305', 'San Nicolás', '16'),
  ('10307', 'San Pablo', '10'),
  ('13505', 'San Pedro', '13'),
  ('02203', 'San Pedro de Atacama', '02'),
  ('08108', 'San Pedro de la Paz', '08'),
  ('07110', 'San Rafael', '07'),
  ('13131', 'San Ramón', '13'),
  ('08310', 'San Rosendo', '08'),
  ('06117', 'San Vicente', '06'),
  ('08311', 'Santa Bárbara', '08'),
  ('06310', 'Santa Cruz', '06'),
  ('08109', 'Santa Juana', '08'),
  ('05706', 'Santa María', '05'),
  ('13101', 'Santiago', '13'),
  ('05606', 'Santo Domingo', '05'),
  ('02103', 'Sierra Gorda', '02'),
  ('13601', 'Talagante', '13'),
  ('07101', 'Talca', '07'),
  ('08110', 'Talcahuano', '08'),
  ('02104', 'Taltal', '02'),
  ('09101', 'Temuco', '09'),
  ('07308', 'Teno', '07'),
  ('09117', 'Teodoro Schmidt', '09'),
  ('03103', 'Tierra Amarilla', '03'),
  ('13303', 'Tiltil', '13'),
  ('12303', 'Timaukel', '12'),
  ('08207', 'Tirúa', '08'),
  ('02301', 'Tocopilla', '02'),
  ('09118', 'Toltén', '09'),
  ('08111', 'Tomé', '08'),
  ('12402', 'Torres del Paine', '12'),
  ('11303', 'Tortel', '11'),
  ('09210', 'Traiguén', '09'),
  ('16207', 'Treguaco', '16'),
  ('08312', 'Tucapel', '08'),
  ('14101', 'Valdivia', '14'),
  ('03301', 'Vallenar', '03'),
  ('05101', 'Valparaíso', '05'),
  ('07309', 'Vichuquén', '07'),
  ('09211', 'Victoria', '09'),
  ('04106', 'Vicuña', '04'),
  ('09119', 'Vilcún', '09'),
  ('07407', 'Villa Alegre', '07'),
  ('05804', 'Villa Alemana', '05'),
  ('09120', 'Villarrica', '09'),
  ('05109', 'Viña del Mar', '05'),
  ('13132', 'Vitacura', '13'),
  ('07408', 'Yerbas Buenas', '07'),
  ('08313', 'Yumbel', '08'),
  ('16109', 'Yungay', '16'),
  ('05405', 'Zapallar', '05');

-- >>> 20261012000200_pets.sql
-- =============================================================================
-- Huellitas · Publicaciones de mascotas de cualquier especie (adopción,
-- perdidas y encontradas), fotos y favoritos.
-- =============================================================================

create type public.listing_kind as enum ('adoption', 'lost', 'found');
-- Especies domésticas. La fauna silvestre está prohibida (Ley de Caza N° 19.473).
create type public.species as enum ('dog', 'cat', 'rabbit', 'rodent', 'bird', 'horse', 'other');
create type public.pet_status as enum ('available', 'in_process', 'adopted', 'reunited', 'paused', 'archived');
create type public.pet_sex as enum ('male', 'female', 'unknown');
create type public.pet_size as enum ('small', 'medium', 'large', 'giant');
create type public.energy_level as enum ('low', 'medium', 'high');

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.listing_kind not null default 'adoption',
  species public.species not null default 'dog',
  status public.pet_status not null default 'available',
  name text not null check (char_length(name) between 1 and 40),
  sex public.pet_sex not null default 'unknown',
  size public.pet_size not null,
  birth_date_estimate date,
  breed text not null default 'Mestizo' check (char_length(breed) between 1 and 60),
  color text check (char_length(color) <= 60),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 0.01 and 1500),
  description text not null check (char_length(description) between 30 and 3000),
  energy public.energy_level,
  good_with_kids boolean,
  good_with_dogs boolean,
  good_with_cats boolean,
  vaccinated boolean not null default false,
  dewormed boolean not null default false,
  sterilized boolean not null default false,
  microchipped boolean not null default false,
  special_needs boolean not null default false,
  health_notes text check (char_length(health_notes) <= 1500),
  requirements text check (char_length(requirements) <= 1500),
  commune_code text not null references public.communes (code),
  -- Los dos primeros dígitos del código CUT de la comuna corresponden a la región.
  region_code text generated always as (left(commune_code, 2)) stored references public.regions (code),
  location_hint text check (char_length(location_hint) <= 120),
  event_date date,
  is_urgent boolean not null default false,
  cover_path text,
  -- Moderación (solo se modifica mediante funciones de moderación).
  hidden boolean not null default false,
  hidden_reason text,
  hidden_at timestamptz,
  adopted_at timestamptz,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.pets.location_hint is
  'Referencia aproximada (sector, plaza). Nunca una dirección exacta.';
comment on column public.pets.event_date is
  'Para perdidos/encontrados: fecha en que se perdió o se encontró.';

create index pets_feed_idx on public.pets (created_at desc) where not hidden;
create index pets_status_kind_idx on public.pets (status, kind);
create index pets_species_idx on public.pets (species);
create index pets_owner_idx on public.pets (owner_id);
create index pets_commune_idx on public.pets (commune_code);
create index pets_region_idx on public.pets (region_code);
create index pets_search_idx on public.pets using gin (search_vector);

-- -----------------------------------------------------------------------------
-- Validaciones y reglas de negocio de las publicaciones
-- -----------------------------------------------------------------------------
create function public.pets_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_commune_name text;
  v_verified boolean;
  v_recent int;
  v_active int;
begin
  -- Limpieza de textos libres.
  new.name := public.clean_text(new.name);
  new.breed := coalesce(public.clean_text(new.breed), 'Mestizo');
  new.color := public.clean_text(new.color);
  new.description := public.clean_text(new.description);
  new.health_notes := public.clean_text(new.health_notes);
  new.requirements := public.clean_text(new.requirements);
  new.location_hint := public.clean_text(new.location_hint);

  if new.name is null then
    raise exception 'El nombre es obligatorio.' using errcode = '23514';
  end if;

  if new.birth_date_estimate is not null
     and (new.birth_date_estimate > current_date or new.birth_date_estimate < current_date - interval '60 years') then
    raise exception 'La edad estimada no es válida.' using errcode = '23514';
  end if;

  if new.event_date is not null
     and (new.event_date > current_date or new.event_date < current_date - interval '3 years') then
    raise exception 'La fecha indicada no es válida.' using errcode = '23514';
  end if;

  select c.name into v_commune_name from public.communes c where c.code = new.commune_code;
  if v_commune_name is null then
    raise exception 'Comuna no válida.' using errcode = '23514';
  end if;

  new.search_vector :=
    setweight(to_tsvector('spanish', public.normalize_text(new.name)), 'A')
    || setweight(to_tsvector('spanish', public.normalize_text(concat_ws(' ',
         case new.species
           when 'dog' then 'perro perrito perrita'
           when 'cat' then 'gato gatito gatita'
           when 'rabbit' then 'conejo conejito'
           when 'rodent' then 'roedor cuy hamster cobayo'
           when 'bird' then 'ave pajaro'
           when 'horse' then 'caballo yegua equino'
           else 'otro'
         end,
         new.breed, new.color, v_commune_name))), 'B')
    || setweight(to_tsvector('spanish', public.normalize_text(concat_ws(' ', new.description, new.location_hint))), 'C');

  -- Contexto confiable (SQL directo o service role): sin reglas de usuario.
  if v_uid is null then
    return new;
  end if;

  perform public.assert_can_act();

  select p.verification_status = 'verified' into v_verified
  from public.profiles p where p.id = v_uid;

  if tg_op = 'INSERT' then
    new.owner_id := v_uid;
    new.status := 'available';
    new.hidden := false;
    new.hidden_reason := null;
    new.hidden_at := null;
    new.adopted_at := null;
    new.cover_path := null;

    -- Límites anti-spam (más amplios para cuentas verificadas).
    select count(*) into v_recent from public.pets d
    where d.owner_id = v_uid and d.created_at > now() - interval '24 hours';
    if v_recent >= (case when v_verified then 30 else 5 end) then
      raise exception 'Alcanzaste el límite de publicaciones por día. Intenta mañana.' using errcode = '54000';
    end if;

    select count(*) into v_active from public.pets d
    where d.owner_id = v_uid and d.status not in ('archived', 'adopted', 'reunited');
    if v_active >= (case when v_verified then 300 else 25 end) then
      raise exception 'Tienes demasiadas publicaciones activas. Archiva las que ya no correspondan.' using errcode = '54000';
    end if;

    return new;
  end if;

  -- UPDATE por la persona dueña.
  if new.status is distinct from old.status then
    if old.kind = 'adoption' and new.status = 'reunited' then
      raise exception 'Estado no válido para una adopción.' using errcode = '23514';
    end if;
    if old.kind in ('lost', 'found') and new.status in ('in_process', 'adopted') then
      raise exception 'Estado no válido para una mascota perdida o encontrada.' using errcode = '23514';
    end if;
    if new.status in ('available', 'paused', 'archived', 'adopted')
       and exists (
         select 1 from public.applications a
         where a.pet_id = new.id and a.status = 'approved'
       ) then
      raise exception 'Hay una solicitud aprobada. Confirma la adopción o cancélala desde la solicitud.' using errcode = '23514';
    end if;
  end if;

  if new.status = 'adopted' and old.status <> 'adopted' then
    new.adopted_at := now();
  elsif new.status <> 'adopted' then
    new.adopted_at := null;
  end if;

  return new;
end;
$$;

create trigger pets_before_write
  before insert or update on public.pets
  for each row execute function public.pets_before_write();

create trigger pets_set_updated_at
  before update on public.pets
  for each row execute function public.set_updated_at();

-- Al publicar una mascota encontrada, avisar a quienes buscan una perdida parecida (misma especie).
create function public.pets_after_insert_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lost record;
begin
  if new.kind <> 'found' then
    return null;
  end if;

  for v_lost in
    select d.id, d.owner_id, d.name
    from public.pets d
    where d.kind = 'lost'
      and d.status = 'available'
      and not d.hidden
      and d.region_code = new.region_code
      and d.species = new.species
      and d.size = new.size
      and (new.sex = 'unknown' or d.sex = 'unknown' or d.sex = new.sex)
      and d.owner_id <> new.owner_id
      and d.created_at > now() - interval '120 days'
    order by (d.commune_code = new.commune_code) desc, d.created_at desc
    limit 25
  loop
    perform public.notify(
      v_lost.owner_id,
      'possible_match',
      'Posible coincidencia para ' || v_lost.name,
      'Publicaron una mascota encontrada con características parecidas en tu región. Revísalo con calma y pide pruebas antes de coordinar.',
      '/mascotas/' || new.id
    );
  end loop;

  return null;
end;
$$;

create trigger pets_after_insert_match
  after insert on public.pets
  for each row execute function public.pets_after_insert_match();

-- -----------------------------------------------------------------------------
-- Seguridad de filas (RLS)
-- -----------------------------------------------------------------------------
alter table public.pets enable row level security;

create policy "Publicaciones visibles para todos" on public.pets
  for select to anon, authenticated
  using (
    not hidden
    and status in ('available', 'in_process', 'adopted', 'reunited')
    and public.is_active_user(owner_id)
  );

create policy "Veo mis publicaciones" on public.pets
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Moderación ve todas las publicaciones" on public.pets
  for select to authenticated
  using ((select public.is_moderator()));

create policy "Publicar mascotas" on public.pets
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Editar mis publicaciones" on public.pets
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.pets from anon, authenticated;
grant select on public.pets to anon, authenticated;
grant insert (
  kind, species, name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy,
  good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized,
  microchipped, special_needs, health_notes, requirements, commune_code, location_hint,
  event_date, is_urgent
) on public.pets to authenticated;
grant update (
  species, name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy,
  good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized,
  microchipped, special_needs, health_notes, requirements, commune_code, location_hint,
  event_date, is_urgent, status
) on public.pets to authenticated;

-- -----------------------------------------------------------------------------
-- Fotos
-- -----------------------------------------------------------------------------
create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  position smallint not null default 0 check (position between 0 and 50),
  created_at timestamptz not null default now()
);

create index pet_photos_pet_idx on public.pet_photos (pet_id, position);

create function public.pet_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  select d.owner_id into v_owner from public.pets d where d.id = new.pet_id;
  if v_owner is null then
    raise exception 'Publicación no encontrada.' using errcode = '23503';
  end if;
  new.owner_id := v_owner;

  if v_uid is not null then
    if v_owner <> v_uid then
      raise exception 'Solo puedes subir fotos a tus publicaciones.' using errcode = '42501';
    end if;
    perform public.assert_can_act();
  end if;

  -- Las fotos deben estar en la carpeta {dueño}/{mascota}/ del bucket.
  if new.storage_path not like v_owner::text || '/' || new.pet_id::text || '/%' then
    raise exception 'Ruta de foto no válida.' using errcode = '23514';
  end if;

  if (select count(*) from public.pet_photos p where p.pet_id = new.pet_id) >= 8 then
    raise exception 'Máximo 8 fotos por publicación.' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger pet_photos_before_insert
  before insert on public.pet_photos
  for each row execute function public.pet_photos_before_insert();

-- Mantiene la foto de portada (la de menor posición).
create function public.pet_photos_refresh_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pet_id uuid := coalesce(new.pet_id, old.pet_id);
  v_cover text;
begin
  select p.storage_path into v_cover
  from public.pet_photos p
  where p.pet_id = v_pet_id
  order by p.position, p.created_at
  limit 1;

  update public.pets d set cover_path = v_cover
  where d.id = v_pet_id and d.cover_path is distinct from v_cover;
  return null;
end;
$$;

create trigger pet_photos_refresh_cover
  after insert or update or delete on public.pet_photos
  for each row execute function public.pet_photos_refresh_cover();

alter table public.pet_photos enable row level security;

-- Una foto es visible si la publicación es visible para quien consulta.
create policy "Fotos visibles si la publicación lo es" on public.pet_photos
  for select to anon, authenticated
  using (exists (select 1 from public.pets d where d.id = pet_photos.pet_id));

create policy "Subir fotos a mis publicaciones" on public.pet_photos
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Ordenar mis fotos" on public.pet_photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Borrar mis fotos" on public.pet_photos
  for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.pet_photos from anon, authenticated;
grant select on public.pet_photos to anon, authenticated;
grant insert (pet_id, storage_path, position) on public.pet_photos to authenticated;
grant update (position) on public.pet_photos to authenticated;
grant delete on public.pet_photos to authenticated;

-- -----------------------------------------------------------------------------
-- Favoritos
-- -----------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

create index favorites_pet_idx on public.favorites (pet_id);

alter table public.favorites enable row level security;

create policy "Ver mis favoritos" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Agregar favoritos" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Quitar favoritos" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (pet_id) on public.favorites to authenticated;

-- >>> 20261012000300_messaging.sql
-- =============================================================================
-- Huellitas · Mensajería interna segura
-- Las personas conversan dentro de la app sin exponer teléfono ni correo.
-- Los datos de contacto solo se comparten si cada persona lo decide.
-- =============================================================================

create type public.message_kind as enum ('user', 'system');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  starter_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  starter_last_read_at timestamptz,
  recipient_last_read_at timestamptz,
  starter_shared_contact_at timestamptz,
  recipient_shared_contact_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pet_id, starter_id, recipient_id),
  check (starter_id <> recipient_id)
);

create index conversations_starter_idx on public.conversations (starter_id, last_message_at desc nulls last);
create index conversations_recipient_idx on public.conversations (recipient_id, last_message_at desc nulls last);

create function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and auth.uid() in (c.starter_id, c.recipient_id)
  );
$$;

alter table public.conversations enable row level security;

create policy "Participantes ven la conversación" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (starter_id, recipient_id));

revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;

-- -----------------------------------------------------------------------------
-- Mensajes
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.message_kind not null default 'user',
  body text not null check (char_length(body) between 1 and 2000),
  safety_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);

-- Detecta textos con señales típicas de estafa o venta (dinero, cuentas, códigos).
create function public.detect_risky_text(p_text text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.normalize_text(p_text) ~ (
    '\m(transferenci\w*|transfier\w*|deposit\w*|cuenta ?rut|cuenta corriente|cuenta vista|numero de cuenta'
    || '|pag(o|os|ar|as|ues|ue|ame)|abon(o|ar|as)|cobr(o|ar|as)|precio|vend(o|emos|er)|venta|lucas|pesos|clp'
    || '|western union|paypal|mercado ?pago|webpay|tarjeta|clave|codigo|cvv|flete|reserva\w*)\M'
    || '|\$ ?[0-9]'
  );
$$;

create function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations%rowtype;
  v_other uuid;
begin
  new.body := public.clean_text(new.body);
  if new.body is null then
    raise exception 'El mensaje está vacío.' using errcode = '23514';
  end if;

  select * into v_conv from public.conversations c where c.id = new.conversation_id;
  if not found then
    raise exception 'Conversación no encontrada.' using errcode = '23503';
  end if;

  -- Los mensajes de sistema solo los crean funciones internas
  -- (el cliente no tiene permiso sobre la columna "kind").
  if new.kind = 'system' or v_uid is null then
    return new;
  end if;

  if new.sender_id <> v_uid or v_uid not in (v_conv.starter_id, v_conv.recipient_id) then
    raise exception 'No participas en esta conversación.' using errcode = '42501';
  end if;

  perform public.assert_can_act();

  v_other := case when v_uid = v_conv.starter_id then v_conv.recipient_id else v_conv.starter_id end;
  if public.is_blocked_between(v_uid, v_other) then
    raise exception 'No es posible enviar mensajes en esta conversación.' using errcode = '42501';
  end if;
  if not public.is_active_user(v_other) then
    raise exception 'Esta cuenta ya no está disponible.' using errcode = '42501';
  end if;

  -- Anti-spam.
  if (select count(*) from public.messages m
      where m.sender_id = v_uid and m.created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Estás enviando mensajes muy rápido. Espera un momento.' using errcode = '54000';
  end if;
  if (select count(*) from public.messages m
      where m.sender_id = v_uid and m.created_at > now() - interval '24 hours') >= 400 then
    raise exception 'Alcanzaste el límite diario de mensajes.' using errcode = '54000';
  end if;

  new.safety_flag := public.detect_risky_text(new.body);
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.messages_before_insert();

create function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations%rowtype;
  v_recipient uuid;
  v_sender_name text;
  v_link text := '/mensajes/' || new.conversation_id;
begin
  update public.conversations c set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 140),
    last_message_sender_id = new.sender_id,
    starter_last_read_at = case when c.starter_id = new.sender_id then new.created_at else c.starter_last_read_at end,
    recipient_last_read_at = case when c.recipient_id = new.sender_id then new.created_at else c.recipient_last_read_at end
  where c.id = new.conversation_id
  returning * into v_conv;

  if new.kind <> 'user' then
    return null;
  end if;

  v_recipient := case when new.sender_id = v_conv.starter_id then v_conv.recipient_id else v_conv.starter_id end;
  select p.display_name into v_sender_name from public.profiles p where p.id = new.sender_id;

  -- Una sola notificación sin leer por conversación.
  update public.notifications n set
    title = 'Nuevo mensaje de ' || v_sender_name,
    body = left(new.body, 140),
    created_at = now()
  where n.user_id = v_recipient and n.type = 'message' and n.link = v_link and n.read_at is null;

  if not found then
    perform public.notify(v_recipient, 'message', 'Nuevo mensaje de ' || v_sender_name, left(new.body, 140), v_link);
  end if;

  return null;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

alter table public.messages enable row level security;

create policy "Participantes leen los mensajes" on public.messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "Participantes envían mensajes" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_participant(conversation_id));

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

-- -----------------------------------------------------------------------------
-- Funciones de mensajería
-- -----------------------------------------------------------------------------

-- Inicia (o recupera) la conversación con quien publicó una mascota.
create function public.start_conversation(p_pet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
  v_pet public.pets%rowtype;
  v_id uuid;
begin
  select * into v_pet from public.pets d where d.id = p_pet_id;
  if not found
     or v_pet.hidden
     or v_pet.status not in ('available', 'in_process', 'adopted', 'reunited')
     or not public.is_active_user(v_pet.owner_id) then
    raise exception 'Publicación no disponible.' using errcode = 'P0002';
  end if;
  if v_pet.owner_id = v_uid then
    raise exception 'Esta es tu propia publicación.' using errcode = '23514';
  end if;
  if public.is_blocked_between(v_uid, v_pet.owner_id) then
    raise exception 'No es posible contactar a esta persona.' using errcode = '42501';
  end if;

  select c.id into v_id from public.conversations c
  where c.pet_id = p_pet_id and c.starter_id = v_uid and c.recipient_id = v_pet.owner_id;
  if v_id is not null then
    return v_id;
  end if;

  if (select count(*) from public.conversations c
      where c.starter_id = v_uid and c.created_at > now() - interval '24 hours') >= 15 then
    raise exception 'Alcanzaste el límite de conversaciones nuevas por hoy.' using errcode = '54000';
  end if;

  insert into public.conversations (pet_id, starter_id, recipient_id)
  values (p_pet_id, v_uid, v_pet.owner_id)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.conversations c set
    starter_last_read_at = case when c.starter_id = v_uid then now() else c.starter_last_read_at end,
    recipient_last_read_at = case when c.recipient_id = v_uid then now() else c.recipient_last_read_at end
  where c.id = p_conversation_id and v_uid in (c.starter_id, c.recipient_id);

  update public.notifications n set read_at = now()
  where n.user_id = v_uid and n.type = 'message'
    and n.link = '/mensajes/' || p_conversation_id and n.read_at is null;
end;
$$;

-- La persona decide compartir sus datos de contacto en esta conversación.
create function public.share_contact(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
  v_conv public.conversations%rowtype;
  v_other uuid;
  v_name text;
begin
  select * into v_conv from public.conversations c
  where c.id = p_conversation_id and v_uid in (c.starter_id, c.recipient_id);
  if not found then
    raise exception 'Conversación no encontrada.' using errcode = 'P0002';
  end if;

  v_other := case when v_uid = v_conv.starter_id then v_conv.recipient_id else v_conv.starter_id end;
  if public.is_blocked_between(v_uid, v_other) then
    raise exception 'No es posible compartir datos en esta conversación.' using errcode = '42501';
  end if;

  if (v_uid = v_conv.starter_id and v_conv.starter_shared_contact_at is not null)
     or (v_uid = v_conv.recipient_id and v_conv.recipient_shared_contact_at is not null) then
    return;
  end if;

  update public.conversations c set
    starter_shared_contact_at = case when c.starter_id = v_uid then now() else c.starter_shared_contact_at end,
    recipient_shared_contact_at = case when c.recipient_id = v_uid then now() else c.recipient_shared_contact_at end
  where c.id = p_conversation_id;

  select p.display_name into v_name from public.profiles p where p.id = v_uid;
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (p_conversation_id, v_uid, 'system', v_name || ' compartió sus datos de contacto.');

  perform public.notify(v_other, 'contact_shared', v_name || ' compartió sus datos de contacto contigo',
    'Recuerda: coordina en lugares públicos y nunca envíes dinero por adelantado.', '/mensajes/' || p_conversation_id);
end;
$$;

-- Devuelve los datos de contacto de la otra persona, solo si los compartió.
create function public.get_conversation_contact(p_conversation_id uuid)
returns table (display_name text, phone text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations%rowtype;
  v_other uuid;
  v_shared timestamptz;
begin
  select * into v_conv from public.conversations c
  where c.id = p_conversation_id and v_uid in (c.starter_id, c.recipient_id);
  if not found then
    return;
  end if;

  if v_uid = v_conv.starter_id then
    v_other := v_conv.recipient_id;
    v_shared := v_conv.recipient_shared_contact_at;
  else
    v_other := v_conv.starter_id;
    v_shared := v_conv.starter_shared_contact_at;
  end if;

  if v_shared is null or public.is_blocked_between(v_uid, v_other) then
    return;
  end if;

  return query
    select p.display_name, pp.phone, u.email::text
    from public.profiles p
    left join public.profile_private pp on pp.user_id = p.id
    left join auth.users u on u.id = p.id
    where p.id = v_other;
end;
$$;

-- Contadores para las insignias del encabezado.
create function public.my_unread_counts()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'notifications', (
      select count(*) from public.notifications n
      where n.user_id = auth.uid() and n.read_at is null and n.type <> 'message'
    ),
    'messages', (
      select count(*) from public.conversations c
      where c.last_message_sender_id is distinct from auth.uid()
        and c.last_message_at is not null
        and (
          (c.starter_id = auth.uid() and c.last_message_at > coalesce(c.starter_last_read_at, '-infinity'))
          or (c.recipient_id = auth.uid() and c.last_message_at > coalesce(c.recipient_last_read_at, '-infinity'))
        )
    )
  );
$$;

-- Quien participa en una conversación puede ver la publicación aunque esté pausada o cerrada.
create policy "Participantes ven la publicación conversada" on public.pets
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.pet_id = pets.id and c.starter_id = (select auth.uid())
    )
  );

-- >>> 20261012000400_applications.sql
-- =============================================================================
-- Huellitas · Solicitudes de adopción y seguimientos post-adopción
-- El flujo de estados se controla 100% en la base de datos:
--   pending → reviewing → approved → completed
--                      ↘ rejected     ↘ cancelled
--   (la persona postulante puede retirarse: withdrawn)
-- =============================================================================

create type public.application_status as enum (
  'pending', 'reviewing', 'approved', 'rejected', 'withdrawn', 'cancelled', 'completed'
);
create type public.housing_type as enum ('house', 'apartment', 'rural', 'other');
create type public.housing_tenure as enum ('owned', 'rented', 'family', 'other');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  applicant_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  publisher_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  status public.application_status not null default 'pending',
  -- Cuestionario
  housing_type public.housing_type not null,
  housing_tenure public.housing_tenure not null,
  landlord_allows_pets boolean,
  has_secure_yard boolean not null,
  adults_count smallint not null check (adults_count between 1 and 20),
  children_count smallint not null default 0 check (children_count between 0 and 20),
  children_ages text check (char_length(children_ages) <= 100),
  household_agrees boolean not null check (household_agrees),
  other_pets text check (char_length(other_pets) <= 600),
  hours_alone smallint not null check (hours_alone between 0 and 24),
  experience text not null check (char_length(experience) between 10 and 1500),
  motivation text not null check (char_length(motivation) between 50 and 2000),
  care_plan text not null check (char_length(care_plan) between 20 and 1500),
  -- Compromisos obligatorios
  commits_vet_care boolean not null check (commits_vet_care),
  commits_sterilization boolean not null check (commits_sterilization),
  accepts_followup boolean not null check (accepts_followup),
  commits_return_not_abandon boolean not null check (commits_return_not_abandon),
  -- Decisión
  decision_message text check (char_length(decision_message) <= 1000),
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index applications_one_active_idx on public.applications (pet_id, applicant_id)
  where status in ('pending', 'reviewing', 'approved');
create unique index applications_one_approved_idx on public.applications (pet_id)
  where status = 'approved';
create index applications_applicant_idx on public.applications (applicant_id, created_at desc);
create index applications_publisher_idx on public.applications (publisher_id, created_at desc);
create index applications_pet_idx on public.applications (pet_id);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create function public.applications_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
  v_pet public.pets%rowtype;
begin
  select * into v_pet from public.pets d where d.id = new.pet_id;
  if not found or v_pet.hidden or not public.is_active_user(v_pet.owner_id) then
    raise exception 'Publicación no disponible.' using errcode = 'P0002';
  end if;
  if v_pet.kind <> 'adoption' then
    raise exception 'Solo se puede postular a mascotas en adopción.' using errcode = '23514';
  end if;
  if v_pet.status <> 'available' then
    raise exception 'Esta mascota no está recibiendo solicitudes en este momento.' using errcode = '23514';
  end if;
  if v_pet.owner_id = v_uid then
    raise exception 'No puedes postular a tu propia publicación.' using errcode = '23514';
  end if;
  if public.is_blocked_between(v_uid, v_pet.owner_id) then
    raise exception 'No es posible postular a esta publicación.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.applications a
    where a.pet_id = new.pet_id and a.applicant_id = v_uid
      and a.status in ('pending', 'reviewing', 'approved')
  ) then
    raise exception 'Ya tienes una solicitud activa para esta mascota.' using errcode = '23505';
  end if;
  if new.housing_tenure = 'rented' and new.landlord_allows_pets is null then
    raise exception 'Indica si tu arriendo permite mascotas.' using errcode = '23514';
  end if;

  -- Anti-spam: postular es un compromiso serio.
  if (select count(*) from public.applications a
      where a.applicant_id = v_uid and a.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Alcanzaste el límite de solicitudes por día.' using errcode = '54000';
  end if;
  if (select count(*) from public.applications a
      where a.applicant_id = v_uid and a.status in ('pending', 'reviewing', 'approved')) >= 8 then
    raise exception 'Tienes demasiadas solicitudes activas. Retira alguna antes de postular de nuevo.' using errcode = '54000';
  end if;

  new.applicant_id := v_uid;
  new.publisher_id := v_pet.owner_id;
  new.status := 'pending';
  new.decision_message := null;
  new.decided_at := null;
  new.completed_at := null;
  new.children_ages := public.clean_text(new.children_ages);
  new.other_pets := public.clean_text(new.other_pets);
  new.experience := public.clean_text(new.experience);
  new.motivation := public.clean_text(new.motivation);
  new.care_plan := public.clean_text(new.care_plan);
  if new.housing_tenure <> 'rented' then
    new.landlord_allows_pets := null;
  end if;

  -- Cada solicitud tiene su conversación (se reutiliza si ya existía).
  insert into public.conversations (pet_id, starter_id, recipient_id)
  values (new.pet_id, v_uid, v_pet.owner_id)
  on conflict (pet_id, starter_id, recipient_id) do nothing;

  select c.id into new.conversation_id from public.conversations c
  where c.pet_id = new.pet_id and c.starter_id = v_uid and c.recipient_id = v_pet.owner_id;

  return new;
end;
$$;

create trigger applications_before_insert
  before insert on public.applications
  for each row execute function public.applications_before_insert();

create function public.applications_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pet_name text;
  v_applicant_name text;
begin
  select d.name into v_pet_name from public.pets d where d.id = new.pet_id;
  select p.display_name into v_applicant_name from public.profiles p where p.id = new.applicant_id;

  insert into public.messages (conversation_id, sender_id, kind, body)
  values (new.conversation_id, new.applicant_id, 'system',
          v_applicant_name || ' envió una solicitud de adopción para ' || v_pet_name || '.');

  perform public.notify(new.publisher_id, 'application_received',
    'Nueva solicitud para ' || v_pet_name,
    v_applicant_name || ' quiere adoptar a ' || v_pet_name || '. Revisa sus respuestas con calma.',
    '/solicitudes/' || new.id);
  return null;
end;
$$;

create trigger applications_after_insert
  after insert on public.applications
  for each row execute function public.applications_after_insert();

alter table public.applications enable row level security;

create policy "Postulante y publicador ven la solicitud" on public.applications
  for select to authenticated
  using ((select auth.uid()) in (applicant_id, publisher_id));

create policy "Postular" on public.applications
  for insert to authenticated
  with check (applicant_id = (select auth.uid()));

revoke all on public.applications from anon, authenticated;
grant select on public.applications to authenticated;
grant insert (
  pet_id, housing_type, housing_tenure, landlord_allows_pets, has_secure_yard, adults_count,
  children_count, children_ages, household_agrees, other_pets, hours_alone, experience,
  motivation, care_plan, commits_vet_care, commits_sterilization, accepts_followup,
  commits_return_not_abandon
) on public.applications to authenticated;

-- Quien postuló puede seguir viendo la publicación aunque cambie de estado.
create policy "Postulantes ven la publicación" on public.pets
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.pet_id = pets.id and a.applicant_id = (select auth.uid())
    )
  );

-- Al cerrar una publicación, se cancelan las solicitudes que seguían abiertas.
create function public.pets_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app record;
begin
  if new.status = old.status or new.status not in ('adopted', 'reunited', 'archived') then
    return null;
  end if;

  for v_app in
    update public.applications a set
      status = 'cancelled',
      decision_message = coalesce(a.decision_message, 'La publicación se cerró.'),
      decided_at = now()
    where a.pet_id = new.id and a.status in ('pending', 'reviewing')
    returning a.id, a.applicant_id
  loop
    perform public.notify(v_app.applicant_id, 'application_cancelled',
      'Solicitud cerrada: ' || new.name,
      case when new.status = 'adopted'
        then new.name || ' ya encontró un hogar. ¡Gracias por querer adoptar! Hay más mascotas esperándote.'
        else 'La publicación de ' || new.name || ' se cerró.'
      end,
      '/solicitudes/' || v_app.id);
  end loop;
  return null;
end;
$$;

create trigger pets_after_status_change
  after update of status on public.pets
  for each row execute function public.pets_after_status_change();

-- -----------------------------------------------------------------------------
-- Seguimientos post-adopción
-- -----------------------------------------------------------------------------
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  adopter_id uuid not null references public.profiles (id) on delete cascade,
  publisher_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  due_on date not null,
  submitted_at timestamptz,
  wellbeing smallint check (wellbeing between 1 and 5),
  notes text check (char_length(notes) <= 2000),
  photo_path text check (char_length(photo_path) <= 300),
  publisher_comment text check (char_length(publisher_comment) <= 1000),
  reminded_at timestamptz,
  overdue_notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id, label)
);

create index followups_adopter_idx on public.followups (adopter_id, due_on);
create index followups_publisher_idx on public.followups (publisher_id, due_on);
create index followups_pending_idx on public.followups (due_on) where submitted_at is null;

alter table public.followups enable row level security;

create policy "Adoptante y publicador ven el seguimiento" on public.followups
  for select to authenticated
  using ((select auth.uid()) in (adopter_id, publisher_id));

revoke all on public.followups from anon, authenticated;
grant select on public.followups to authenticated;

-- -----------------------------------------------------------------------------
-- Funciones del flujo de adopción
-- -----------------------------------------------------------------------------

-- Publicador: revisar, aprobar, rechazar o cancelar (si una aprobación no prosperó).
create function public.review_application(
  p_application_id uuid,
  p_status public.application_status,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
  v_app public.applications%rowtype;
  v_pet public.pets%rowtype;
  v_msg text := left(public.clean_text(p_message), 1000);
  v_title text;
  v_body text;
  v_system text;
begin
  select * into v_app from public.applications a where a.id = p_application_id for update;
  if not found or v_app.publisher_id <> v_uid then
    raise exception 'Solicitud no encontrada.' using errcode = 'P0002';
  end if;

  if not (
    (v_app.status = 'pending' and p_status in ('reviewing', 'approved', 'rejected'))
    or (v_app.status = 'reviewing' and p_status in ('approved', 'rejected'))
    or (v_app.status = 'approved' and p_status = 'cancelled')
  ) then
    raise exception 'Este cambio de estado no está permitido.' using errcode = '23514';
  end if;

  select * into v_pet from public.pets d where d.id = v_app.pet_id for update;

  if p_status = 'approved' then
    if v_pet.status not in ('available', 'in_process') or v_pet.hidden then
      raise exception 'La mascota no está disponible para aprobar solicitudes.' using errcode = '23514';
    end if;
    if exists (select 1 from public.applications a where a.pet_id = v_app.pet_id and a.status = 'approved') then
      raise exception 'Ya hay una solicitud aprobada para esta mascota.' using errcode = '23505';
    end if;
  end if;

  update public.applications a set
    status = p_status,
    decision_message = coalesce(v_msg, a.decision_message),
    decided_at = now()
  where a.id = p_application_id;

  if p_status = 'approved' then
    update public.pets d set status = 'in_process' where d.id = v_app.pet_id and d.status = 'available';
  elsif p_status = 'cancelled' then
    update public.pets d set status = 'available' where d.id = v_app.pet_id and d.status = 'in_process';
  end if;

  case p_status
    when 'reviewing' then
      v_title := 'Tu solicitud para ' || v_pet.name || ' está en revisión';
      v_body := 'Quien publicó está revisando tus respuestas. Puede que te escriba por el chat.';
      v_system := 'La solicitud pasó a revisión.';
    when 'approved' then
      v_title := '¡Tu solicitud para ' || v_pet.name || ' fue aprobada!';
      v_body := 'Coordinen la entrega por el chat. Reúnanse en un lugar seguro y nunca pagues por adelantado.';
      v_system := 'La solicitud fue aprobada. Coordinen la entrega con calma y en un lugar seguro.';
    when 'rejected' then
      v_title := 'Tu solicitud para ' || v_pet.name || ' no fue aceptada';
      v_body := coalesce(v_msg, 'Gracias por postular. Hay más mascotas esperando un hogar.');
      v_system := 'La solicitud no fue aceptada.';
    when 'cancelled' then
      v_title := 'La adopción de ' || v_pet.name || ' fue cancelada';
      v_body := coalesce(v_msg, 'Quien publicó canceló la aprobación.');
      v_system := 'La aprobación fue cancelada.';
  end case;

  perform public.notify(v_app.applicant_id, 'application_' || p_status::text, v_title, v_body,
    '/solicitudes/' || p_application_id);

  if v_app.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (v_app.conversation_id, v_uid, 'system', v_system);
  end if;
end;
$$;

-- Postulante: retirar su solicitud.
create function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.applications%rowtype;
  v_pet_name text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión.' using errcode = '28000';
  end if;

  select * into v_app from public.applications a where a.id = p_application_id for update;
  if not found or v_app.applicant_id <> v_uid then
    raise exception 'Solicitud no encontrada.' using errcode = 'P0002';
  end if;
  if v_app.status not in ('pending', 'reviewing', 'approved') then
    raise exception 'Esta solicitud ya no se puede retirar.' using errcode = '23514';
  end if;

  update public.applications a set status = 'withdrawn', decided_at = now() where a.id = p_application_id;

  if v_app.status = 'approved' then
    update public.pets d set status = 'available' where d.id = v_app.pet_id and d.status = 'in_process';
  end if;

  select d.name into v_pet_name from public.pets d where d.id = v_app.pet_id;
  select p.display_name into v_name from public.profiles p where p.id = v_uid;

  perform public.notify(v_app.publisher_id, 'application_withdrawn',
    v_name || ' retiró su solicitud para ' || v_pet_name, null, '/solicitudes/' || p_application_id);

  if v_app.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (v_app.conversation_id, v_uid, 'system', v_name || ' retiró su solicitud.');
  end if;
end;
$$;

-- Publicador: confirmar que la adopción se concretó (entrega realizada).
create function public.complete_adoption(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
  v_app public.applications%rowtype;
  v_pet_name text;
begin
  select * into v_app from public.applications a where a.id = p_application_id for update;
  if not found or v_app.publisher_id <> v_uid then
    raise exception 'Solicitud no encontrada.' using errcode = 'P0002';
  end if;
  if v_app.status <> 'approved' then
    raise exception 'Solo puedes confirmar adopciones de solicitudes aprobadas.' using errcode = '23514';
  end if;

  update public.applications a set status = 'completed', completed_at = now() where a.id = p_application_id;
  update public.pets d set status = 'adopted' where d.id = v_app.pet_id;

  insert into public.followups (application_id, pet_id, adopter_id, publisher_id, label, due_on)
  select p_application_id, v_app.pet_id, v_app.applicant_id, v_app.publisher_id, f.label, current_date + f.days
  from (values ('1 semana', 7), ('1 mes', 30), ('3 meses', 90), ('6 meses', 180)) as f (label, days);

  select d.name into v_pet_name from public.pets d where d.id = v_app.pet_id;

  perform public.notify(v_app.applicant_id, 'adoption_completed',
    '¡Felicitaciones! ' || v_pet_name || ' ya es parte de tu familia',
    'Te pediremos breves seguimientos (1 semana, 1, 3 y 6 meses) para saber cómo está.',
    '/seguimientos');

  if v_app.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (v_app.conversation_id, v_uid, 'system', '¡Adopción concretada! Gracias por darle un hogar a ' || v_pet_name || '.');
  end if;
end;
$$;

-- Adoptante: enviar un seguimiento.
create function public.submit_followup(
  p_followup_id uuid,
  p_wellbeing smallint,
  p_notes text,
  p_photo_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_f public.followups%rowtype;
  v_notes text := public.clean_text(p_notes);
  v_pet_name text;
begin
  select * into v_f from public.followups f where f.id = p_followup_id for update;
  if not found or v_f.adopter_id is distinct from v_uid then
    raise exception 'Seguimiento no encontrado.' using errcode = 'P0002';
  end if;
  if v_f.submitted_at is not null then
    raise exception 'Este seguimiento ya fue enviado.' using errcode = '23514';
  end if;
  if v_f.due_on > current_date + 7 then
    raise exception 'Aún no es momento de este seguimiento (fecha: %).', to_char(v_f.due_on, 'DD-MM-YYYY') using errcode = '23514';
  end if;
  if p_wellbeing is null or p_wellbeing not between 1 and 5 then
    raise exception 'Indica cómo está tu mascota (1 a 5).' using errcode = '23514';
  end if;
  if v_notes is null or char_length(v_notes) < 10 then
    raise exception 'Cuéntanos un poco más (mínimo 10 caracteres).' using errcode = '23514';
  end if;
  if p_photo_path is not null
     and p_photo_path not like v_uid::text || '/' || p_followup_id::text || '/%' then
    raise exception 'Ruta de foto no válida.' using errcode = '23514';
  end if;

  update public.followups f set
    submitted_at = now(),
    wellbeing = p_wellbeing,
    notes = left(v_notes, 2000),
    photo_path = p_photo_path
  where f.id = p_followup_id;

  select d.name into v_pet_name from public.pets d where d.id = v_f.pet_id;
  perform public.notify(v_f.publisher_id, 'followup_submitted',
    'Nuevo seguimiento de ' || v_pet_name || ' (' || v_f.label || ')', left(v_notes, 140),
    '/seguimientos/' || p_followup_id);
end;
$$;

-- Publicador: responder a un seguimiento.
create function public.comment_followup(p_followup_id uuid, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_f public.followups%rowtype;
  v_comment text := left(public.clean_text(p_comment), 1000);
begin
  select * into v_f from public.followups f where f.id = p_followup_id for update;
  if not found or v_f.publisher_id is distinct from v_uid then
    raise exception 'Seguimiento no encontrado.' using errcode = 'P0002';
  end if;
  if v_f.submitted_at is null then
    raise exception 'El seguimiento aún no fue enviado.' using errcode = '23514';
  end if;
  if v_comment is null then
    raise exception 'Escribe un comentario.' using errcode = '23514';
  end if;

  update public.followups f set publisher_comment = v_comment where f.id = p_followup_id;
  perform public.notify(v_f.adopter_id, 'followup_comment', 'Respondieron a tu seguimiento',
    left(v_comment, 140), '/seguimientos/' || p_followup_id);
end;
$$;

-- Tarea diaria: recordatorios de seguimientos pendientes y atrasados.
create function public.notify_due_followups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_f record;
  v_count integer := 0;
begin
  for v_f in
    update public.followups f set reminded_at = now()
    where f.submitted_at is null and f.reminded_at is null and f.due_on <= current_date
    returning f.id, f.adopter_id, f.label, (select d.name from public.pets d where d.id = f.pet_id) as pet_name
  loop
    perform public.notify(v_f.adopter_id, 'followup_due',
      'Es momento del seguimiento de ' || v_f.pet_name || ' (' || v_f.label || ')',
      'Cuéntanos cómo está y comparte una foto. Toma menos de 2 minutos.',
      '/seguimientos/' || v_f.id);
    v_count := v_count + 1;
  end loop;

  for v_f in
    update public.followups f set overdue_notified_at = now()
    where f.submitted_at is null and f.overdue_notified_at is null and f.due_on <= current_date - 14
    returning f.id, f.adopter_id, f.publisher_id, f.label, (select d.name from public.pets d where d.id = f.pet_id) as pet_name
  loop
    perform public.notify(v_f.publisher_id, 'followup_overdue',
      'Seguimiento atrasado: ' || v_f.pet_name || ' (' || v_f.label || ')',
      'Puedes escribirle a la persona adoptante por el chat. Si sospechas maltrato, repórtalo.',
      '/seguimientos/' || v_f.id);
    perform public.notify(v_f.adopter_id, 'followup_overdue',
      'Tienes un seguimiento atrasado de ' || v_f.pet_name,
      'Por favor envíalo: así cuidamos a cada mascota adoptada.',
      '/seguimientos/' || v_f.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- >>> 20261012000500_safety_moderation.sql
-- =============================================================================
-- Huellitas · Seguridad y moderación
-- Reportes, verificación de rescatistas/fundaciones, acciones de moderación
-- (siempre auditadas) y estadísticas públicas.
-- =============================================================================

create type public.report_reason as enum (
  'animal_sale',     -- venta de animales
  'animal_abuse',    -- maltrato o sospecha de maltrato
  'scam',            -- estafa o petición de dinero
  'false_info',      -- información falsa
  'inappropriate',   -- contenido inapropiado
  'harassment',      -- acoso o amenazas
  'spam',
  'impersonation',   -- suplantación de identidad
  'other'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('pet', 'user', 'message')),
  pet_id uuid references public.pets (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  message_snapshot text,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text check (char_length(resolution_note) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_pet_idx on public.reports (pet_id) where pet_id is not null;
create index reports_user_idx on public.reports (reported_user_id) where reported_user_id is not null;
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

create function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_msg record;
begin
  if v_uid is null then
    return new;
  end if;
  if not public.is_active_user(v_uid) then
    raise exception 'Tu cuenta está suspendida.' using errcode = '42501';
  end if;

  new.reporter_id := v_uid;
  new.status := 'open';
  new.resolution_note := null;
  new.resolved_by := null;
  new.resolved_at := null;
  new.message_snapshot := null;
  new.details := left(public.clean_text(new.details), 2000);

  if new.target_type = 'pet' then
    select d.owner_id into v_owner from public.pets d where d.id = new.pet_id;
    if v_owner is null then
      raise exception 'Publicación no encontrada.' using errcode = 'P0002';
    end if;
    if v_owner = v_uid then
      raise exception 'No puedes reportar tu propia publicación.' using errcode = '23514';
    end if;
    new.reported_user_id := v_owner;
    new.message_id := null;

  elsif new.target_type = 'message' then
    select m.sender_id, m.body, m.kind, c.starter_id, c.recipient_id, c.pet_id into v_msg
    from public.messages m join public.conversations c on c.id = m.conversation_id
    where m.id = new.message_id;
    if not found or v_uid not in (v_msg.starter_id, v_msg.recipient_id) then
      raise exception 'Mensaje no encontrado.' using errcode = 'P0002';
    end if;
    if v_msg.sender_id = v_uid or v_msg.kind <> 'user' then
      raise exception 'No puedes reportar este mensaje.' using errcode = '23514';
    end if;
    new.reported_user_id := v_msg.sender_id;
    new.pet_id := v_msg.pet_id;
    new.message_snapshot := v_msg.body;

  else -- user
    if new.reported_user_id is null or new.reported_user_id = v_uid
       or not exists (select 1 from public.profiles p where p.id = new.reported_user_id) then
      raise exception 'Persona no válida.' using errcode = '23514';
    end if;
    new.pet_id := null;
    new.message_id := null;
  end if;

  if (select count(*) from public.reports r
      where r.reporter_id = v_uid and r.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Alcanzaste el límite de reportes por día. Si es una emergencia, contacta a las autoridades.' using errcode = '54000';
  end if;

  if exists (
    select 1 from public.reports r
    where r.reporter_id = v_uid
      and r.status in ('open', 'reviewing')
      and r.target_type = new.target_type
      and r.pet_id is not distinct from new.pet_id
      and r.message_id is not distinct from new.message_id
      and r.reported_user_id is not distinct from new.reported_user_id
  ) then
    raise exception 'Ya enviaste un reporte sobre esto. Lo estamos revisando.' using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

create function public.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporters integer;
  v_pet public.pets%rowtype;
  v_urgent boolean := new.reason in ('animal_abuse', 'animal_sale', 'scam');
begin
  -- Ocultar automáticamente publicaciones con varios reportes de personas distintas.
  if new.target_type = 'pet' and new.pet_id is not null then
    select count(distinct r.reporter_id) into v_reporters
    from public.reports r
    where r.pet_id = new.pet_id and r.target_type = 'pet' and r.status in ('open', 'reviewing');

    select * into v_pet from public.pets d where d.id = new.pet_id;
    if v_reporters >= 3 and not v_pet.hidden then
      update public.pets d set
        hidden = true,
        hidden_reason = 'Oculta automáticamente por varios reportes. Moderación la está revisando.',
        hidden_at = now()
      where d.id = new.pet_id;

      insert into public.audit_log (actor_id, action, target_type, target_id, details)
      values (null, 'auto_hide_pet', 'pet', new.pet_id::text, json_build_object('reporters', v_reporters)::jsonb);

      perform public.notify(v_pet.owner_id, 'pet_hidden',
        'Tu publicación de ' || v_pet.name || ' está en revisión',
        'Recibió varios reportes y quedó oculta mientras moderación la revisa.',
        '/mis-publicaciones');
    end if;
  end if;

  perform public.notify_moderators('report_new',
    case when v_urgent then 'Reporte urgente: ' else 'Nuevo reporte: ' end
      || case new.reason
           when 'animal_sale' then 'venta de animales'
           when 'animal_abuse' then 'posible maltrato'
           when 'scam' then 'posible estafa'
           when 'false_info' then 'información falsa'
           when 'inappropriate' then 'contenido inapropiado'
           when 'harassment' then 'acoso'
           when 'spam' then 'spam'
           when 'impersonation' then 'suplantación'
           else 'otro motivo'
         end,
    left(new.details, 140),
    '/admin/reportes');
  return null;
end;
$$;

create trigger reports_after_insert
  after insert on public.reports
  for each row execute function public.reports_after_insert();

alter table public.reports enable row level security;

create policy "Veo mis reportes y moderación ve todos" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));

create policy "Reportar" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (target_type, pet_id, reported_user_id, message_id, reason, details) on public.reports to authenticated;

-- -----------------------------------------------------------------------------
-- Solicitudes de verificación (rescatistas y fundaciones)
-- -----------------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  requested_type public.account_type not null check (requested_type in ('rescuer', 'shelter')),
  organization_name text check (char_length(organization_name) <= 120),
  description text not null check (char_length(description) between 30 and 2000),
  social_links text check (char_length(social_links) <= 500),
  document_path text check (char_length(document_path) <= 300),
  status public.verification_status not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index verification_one_pending_idx on public.verification_requests (user_id) where status = 'pending';
create index verification_status_idx on public.verification_requests (status, created_at);

create function public.verification_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
begin
  if exists (select 1 from public.verification_requests v where v.user_id = v_uid and v.status = 'pending') then
    raise exception 'Ya tienes una solicitud de verificación en revisión.' using errcode = '23505';
  end if;
  if (select count(*) from public.verification_requests v
      where v.user_id = v_uid and v.created_at > now() - interval '30 days') >= 3 then
    raise exception 'Demasiadas solicitudes este mes. Escríbenos si necesitas ayuda.' using errcode = '54000';
  end if;
  if new.document_path is not null and new.document_path not like v_uid::text || '/%' then
    raise exception 'Ruta de documento no válida.' using errcode = '23514';
  end if;

  new.user_id := v_uid;
  new.status := 'pending';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.organization_name := public.clean_text(new.organization_name);
  new.description := public.clean_text(new.description);
  new.social_links := public.clean_text(new.social_links);
  return new;
end;
$$;

create trigger verification_before_insert
  before insert on public.verification_requests
  for each row execute function public.verification_before_insert();

create function public.verification_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p set verification_status = 'pending'
  where p.id = new.user_id and p.verification_status <> 'verified';

  perform public.notify_moderators('verification_new', 'Nueva solicitud de verificación',
    coalesce(new.organization_name, 'Rescatista independiente'), '/admin/verificaciones');
  return null;
end;
$$;

create trigger verification_after_insert
  after insert on public.verification_requests
  for each row execute function public.verification_after_insert();

alter table public.verification_requests enable row level security;

create policy "Veo mis verificaciones y moderación ve todas" on public.verification_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));

create policy "Solicitar verificación" on public.verification_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;
grant insert (requested_type, organization_name, description, social_links, document_path)
  on public.verification_requests to authenticated;

-- -----------------------------------------------------------------------------
-- Acciones de moderación (todas quedan en audit_log)
-- -----------------------------------------------------------------------------
create function public.assert_moderator()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Acción reservada para moderación.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function public.moderate_pet(p_pet_id uuid, p_hide boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_moderator();
  v_pet public.pets%rowtype;
  v_reason text := left(public.clean_text(p_reason), 500);
begin
  select * into v_pet from public.pets d where d.id = p_pet_id for update;
  if not found then
    raise exception 'Publicación no encontrada.' using errcode = 'P0002';
  end if;
  if p_hide and v_reason is null then
    raise exception 'Indica el motivo para ocultar la publicación.' using errcode = '23514';
  end if;

  update public.pets d set
    hidden = p_hide,
    hidden_reason = case when p_hide then v_reason else null end,
    hidden_at = case when p_hide then now() else null end
  where d.id = p_pet_id;

  perform public.log_action(case when p_hide then 'hide_pet' else 'unhide_pet' end, 'pet', p_pet_id::text,
    jsonb_build_object('reason', v_reason, 'pet_name', v_pet.name));

  perform public.notify(v_pet.owner_id,
    case when p_hide then 'pet_hidden' else 'pet_restored' end,
    case when p_hide then 'Tu publicación de ' || v_pet.name || ' fue ocultada'
         else 'Tu publicación de ' || v_pet.name || ' volvió a estar visible' end,
    case when p_hide then 'Motivo: ' || v_reason else null end,
    '/mis-publicaciones');
end;
$$;

create function public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_moderator();
  v_report public.reports%rowtype;
  v_note text := left(public.clean_text(p_note), 1000);
begin
  select * into v_report from public.reports r where r.id = p_report_id for update;
  if not found then
    raise exception 'Reporte no encontrado.' using errcode = 'P0002';
  end if;

  update public.reports r set
    status = p_status,
    resolution_note = coalesce(v_note, r.resolution_note),
    resolved_by = case when p_status in ('resolved', 'dismissed') then v_uid else null end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
  where r.id = p_report_id;

  perform public.log_action('report_' || p_status::text, 'report', p_report_id::text,
    jsonb_build_object('note', v_note, 'reason', v_report.reason));

  if p_status in ('resolved', 'dismissed') then
    perform public.notify(v_report.reporter_id, 'report_closed', 'Revisamos tu reporte',
      case when p_status = 'resolved'
        then 'Tomamos medidas. Gracias por ayudar a cuidar la comunidad.'
        else 'No encontramos una infracción a las normas. Gracias por avisarnos.'
      end,
      '/perfil#reportes');
  end if;
end;
$$;

create function public.set_account_status(
  p_user_id uuid,
  p_status public.account_status,
  p_reason text,
  p_days integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_moderator();
  v_target public.profiles%rowtype;
  v_reason text := left(public.clean_text(p_reason), 500);
begin
  select * into v_target from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception 'Persona no encontrada.' using errcode = 'P0002';
  end if;
  if p_user_id = v_uid then
    raise exception 'No puedes moderar tu propia cuenta.' using errcode = '42501';
  end if;
  if v_target.role <> 'user' and not public.is_admin() then
    raise exception 'Solo administración puede moderar a otras personas del equipo.' using errcode = '42501';
  end if;
  if p_status <> 'active' and v_reason is null then
    raise exception 'Indica el motivo.' using errcode = '23514';
  end if;
  if p_status = 'suspended' and (p_days is null or p_days not between 1 and 365) then
    raise exception 'Indica la duración de la suspensión (1 a 365 días).' using errcode = '23514';
  end if;

  update public.profiles p set
    account_status = p_status,
    suspended_until = case when p_status = 'suspended' then now() + make_interval(days => p_days) else null end
  where p.id = p_user_id;

  perform public.log_action('account_' || p_status::text, 'user', p_user_id::text,
    jsonb_build_object('reason', v_reason, 'days', p_days, 'display_name', v_target.display_name));

  perform public.notify(p_user_id, 'account_status',
    case p_status
      when 'active' then 'Tu cuenta fue reactivada'
      when 'suspended' then 'Tu cuenta fue suspendida por ' || p_days || ' días'
      else 'Tu cuenta fue bloqueada'
    end,
    case when p_status = 'active' then null else 'Motivo: ' || v_reason end,
    '/notificaciones');
end;
$$;

create function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Acción reservada para administración.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol.' using errcode = '42501';
  end if;

  update public.profiles p set role = p_role where p.id = p_user_id;
  if not found then
    raise exception 'Persona no encontrada.' using errcode = 'P0002';
  end if;

  perform public.log_action('set_role', 'user', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;

create function public.review_verification(p_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_moderator();
  v_req public.verification_requests%rowtype;
  v_note text := left(public.clean_text(p_note), 1000);
begin
  select * into v_req from public.verification_requests v where v.id = p_request_id for update;
  if not found or v_req.status <> 'pending' then
    raise exception 'Solicitud no encontrada o ya revisada.' using errcode = 'P0002';
  end if;
  if v_req.user_id = v_uid then
    raise exception 'No puedes revisar tu propia solicitud.' using errcode = '42501';
  end if;
  if not p_approve and v_note is null then
    raise exception 'Indica el motivo del rechazo.' using errcode = '23514';
  end if;

  update public.verification_requests v set
    status = case when p_approve then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
    review_note = v_note,
    reviewed_by = v_uid,
    reviewed_at = now()
  where v.id = p_request_id;

  if p_approve then
    update public.profiles p set account_type = v_req.requested_type where p.id = v_req.user_id;
    update public.profiles p set verification_status = 'verified', verified_at = now() where p.id = v_req.user_id;
  else
    update public.profiles p set verification_status = 'rejected'
    where p.id = v_req.user_id and p.verification_status = 'pending';
  end if;

  perform public.log_action(case when p_approve then 'verification_approved' else 'verification_rejected' end,
    'user', v_req.user_id::text, jsonb_build_object('request_id', p_request_id, 'note', v_note));

  perform public.notify(v_req.user_id, 'verification_result',
    case when p_approve then '¡Tu cuenta fue verificada!' else 'Tu solicitud de verificación no fue aprobada' end,
    coalesce(v_note, case when p_approve then 'Ahora tu perfil muestra la insignia de verificación.' else null end),
    '/perfil');
end;
$$;

create function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  return json_build_object(
    'open_reports', (select count(*) from public.reports r where r.status in ('open', 'reviewing')),
    'urgent_reports', (select count(*) from public.reports r
                       where r.status in ('open', 'reviewing') and r.reason in ('animal_abuse', 'animal_sale', 'scam')),
    'pending_verifications', (select count(*) from public.verification_requests v where v.status = 'pending'),
    'hidden_pets', (select count(*) from public.pets d where d.hidden),
    'users', (select count(*) from public.profiles),
    'suspended_users', (select count(*) from public.profiles p where p.account_status <> 'active'),
    'pets_available', (select count(*) from public.pets d where d.status = 'available' and not d.hidden),
    'adoptions_completed', (select count(*) from public.applications a where a.status = 'completed'),
    'applications_last_7d', (select count(*) from public.applications a where a.created_at > now() - interval '7 days'),
    'overdue_followups', (select count(*) from public.followups f
                          where f.submitted_at is null and f.due_on < current_date - 14)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Estadísticas públicas
-- -----------------------------------------------------------------------------
create function public.get_public_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'available', (select count(*) from public.pets d
                  where d.kind = 'adoption' and d.status = 'available' and not d.hidden),
    'adopted', (select count(*) from public.pets d where d.status = 'adopted'),
    'reunited', (select count(*) from public.pets d where d.status = 'reunited'),
    'lost_active', (select count(*) from public.pets d
                    where d.kind = 'lost' and d.status = 'available' and not d.hidden),
    'verified_orgs', (select count(*) from public.profiles p
                      where p.verification_status = 'verified' and p.account_type in ('rescuer', 'shelter'))
  );
$$;

create function public.get_profile_stats(p_user_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'active_listings', (select count(*) from public.pets d
                        where d.owner_id = p_user_id and not d.hidden
                          and d.status in ('available', 'in_process')),
    'adoptions_given', (select count(*) from public.applications a
                        where a.publisher_id = p_user_id and a.status = 'completed'),
    'adoptions_received', (select count(*) from public.applications a
                           where a.applicant_id = p_user_id and a.status = 'completed'),
    'followups_on_time', (select count(*) from public.followups f
                          where f.adopter_id = p_user_id and f.submitted_at is not null
                            and f.submitted_at::date <= f.due_on + 14)
  );
$$;

-- >>> 20261012000600_storage_realtime.sql
-- =============================================================================
-- Huellitas · Almacenamiento de archivos, tiempo real, tareas programadas
-- y permisos finales de funciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
--   avatars            público   2 MB   fotos de perfil
--   pet-photos         público   5 MB   fotos de publicaciones
--   followup-photos    privado   5 MB   fotos de seguimiento (solo adoptante y publicador)
--   verification-docs  privado  10 MB   respaldos de verificación (solo dueño y moderación)
-- Las imágenes se reducen y se les quitan metadatos (EXIF/GPS) en el navegador
-- antes de subirlas.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('followup-photos', 'followup-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Avatares: cada persona administra su carpeta {uid}/
create policy "Avatar: ver mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Avatar: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Avatar: reemplazar en mi carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Avatar: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Fotos de mascotas: {uid}/{pet_id}/archivo, solo en publicaciones propias.
-- Ojo: dentro de los EXISTS se usa objects.name, porque "name" también es una columna de pets.
create policy "Fotos mascota: ver mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Fotos mascota: subir a mis publicaciones" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.pets d
      where d.id::text = (storage.foldername(objects.name))[2] and d.owner_id = (select auth.uid())
    )
  );
create policy "Fotos mascota: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Fotos de seguimiento: {adoptante}/{followup_id}/archivo
create policy "Seguimiento: ver si participo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'followup-photos'
    and exists (
      select 1 from public.followups f
      where f.id::text = (storage.foldername(objects.name))[2]
        and (select auth.uid()) in (f.adopter_id, f.publisher_id)
    )
  );
create policy "Seguimiento: subir el mío" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'followup-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.followups f
      where f.id::text = (storage.foldername(objects.name))[2]
        and f.adopter_id = (select auth.uid())
        and f.submitted_at is null
    )
  );
create policy "Seguimiento: borrar el mío" on storage.objects
  for delete to authenticated
  using (bucket_id = 'followup-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Documentos de verificación: {uid}/archivo
create policy "Verificación: ver mis documentos o moderación" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or (select public.is_moderator()))
  );
create policy "Verificación: subir mis documentos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Verificación: borrar mis documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- -----------------------------------------------------------------------------
-- Tiempo real (chat, notificaciones y bandeja de conversaciones)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.conversations;

-- -----------------------------------------------------------------------------
-- Tarea diaria de seguimientos (si pg_cron está disponible)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('huellitas-seguimientos', '0 13 * * *', 'select public.notify_due_followups()');
  end if;
exception when others then
  raise notice 'pg_cron no disponible (%). Programa public.notify_due_followups() manualmente.', sqlerrm;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución de funciones
-- Por defecto nadie puede ejecutar funciones; se habilitan solo las necesarias.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Utilidades puras usadas por triggers que corren con los permisos de quien edita.
grant execute on function
  public.clean_text(text),
  public.normalize_text(text),
  public.detect_risky_text(text)
to anon, authenticated;

-- Usadas por políticas RLS o públicas.
grant execute on function
  public.is_active_user(uuid),
  public.get_public_stats(),
  public.get_profile_stats(uuid)
to anon, authenticated;

grant execute on function
  public.is_moderator(),
  public.is_admin(),
  public.is_conversation_participant(uuid),
  public.my_unread_counts(),
  public.start_conversation(uuid),
  public.mark_conversation_read(uuid),
  public.share_contact(uuid),
  public.get_conversation_contact(uuid),
  public.review_application(uuid, public.application_status, text),
  public.withdraw_application(uuid),
  public.complete_adoption(uuid),
  public.submit_followup(uuid, smallint, text, text),
  public.comment_followup(uuid, text),
  public.moderate_pet(uuid, boolean, text),
  public.resolve_report(uuid, public.report_status, text),
  public.set_account_status(uuid, public.account_status, text, integer),
  public.set_user_role(uuid, public.user_role),
  public.review_verification(uuid, boolean, text),
  public.admin_overview()
to authenticated;

-- >>> 20261012000700_alerts.sql
-- =============================================================================
-- Huellitas · Alertas de búsqueda
-- Cada persona guarda hasta 10 búsquedas (tipo, especie, región/comuna, tamaño)
-- y recibe una notificación apenas se publica una mascota que coincide.
-- Muy útil para familias que buscan a su mascota perdida.
-- =============================================================================

create table public.pet_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.listing_kind not null default 'adoption',
  species public.species,
  region_code text references public.regions (code),
  commune_code text references public.communes (code),
  size public.pet_size,
  created_at timestamptz not null default now(),
  constraint pet_alerts_commune_in_region check (
    commune_code is null or (region_code is not null and left(commune_code, 2) = region_code)
  )
);

create unique index pet_alerts_unique_idx
  on public.pet_alerts (user_id, kind, species, region_code, commune_code, size) nulls not distinct;
create index pet_alerts_match_idx on public.pet_alerts (kind, species, region_code);

-- Valida quién crea la alerta y limita la cantidad por persona.
create function public.pet_alerts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := public.assert_can_act();
  end if;

  if new.commune_code is not null then
    new.region_code := left(new.commune_code, 2);
  end if;

  if (select count(*) from public.pet_alerts a where a.user_id = new.user_id) >= 10 then
    raise exception 'Puedes tener hasta 10 alertas. Elimina alguna para crear otra.' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger pet_alerts_before_insert
  before insert on public.pet_alerts
  for each row execute function public.pet_alerts_before_insert();

alter table public.pet_alerts enable row level security;

create policy "Ver mis alertas" on public.pet_alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Crear mis alertas" on public.pet_alerts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Borrar mis alertas" on public.pet_alerts
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.pet_alerts from anon, authenticated;
grant select, delete on public.pet_alerts to authenticated;
grant insert (kind, species, region_code, commune_code, size) on public.pet_alerts to authenticated;

-- Avisa a quienes tienen una alerta que coincide con la nueva publicación.
-- No avisa a quien publica, a cuentas suspendidas ni entre personas bloqueadas.
create function public.pets_after_insert_alerts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status <> 'available' or new.hidden then
    return null;
  end if;

  v_title := case new.kind
    when 'adoption' then 'Nueva mascota en adopción para tu alerta'
    when 'lost' then 'Se perdió una mascota que coincide con tu alerta'
    else 'Encontraron una mascota que coincide con tu alerta'
  end;

  v_body := new.name || ' · ' ||
    case new.species
      when 'dog' then 'Perro'
      when 'cat' then 'Gato'
      when 'rabbit' then 'Conejo'
      when 'rodent' then 'Roedor'
      when 'bird' then 'Ave'
      when 'horse' then 'Caballo'
      else 'Otro animal'
    end || ' · ' ||
    coalesce((select c.name from public.communes c where c.code = new.commune_code), 'Chile') ||
    case when new.kind = 'adoption'
      then '. Recuerda: la adopción es siempre gratuita.'
      else '. Si la reconoces, escribe por el chat y pide pruebas antes de coordinar.'
    end;

  insert into public.notifications (user_id, type, title, body, link)
  select distinct a.user_id, 'pet_alert', v_title, left(v_body, 400), '/mascotas/' || new.id
  from public.pet_alerts a
  where a.kind = new.kind
    and (a.species is null or a.species = new.species)
    and (a.region_code is null or a.region_code = new.region_code)
    and (a.commune_code is null or a.commune_code = new.commune_code)
    and (a.size is null or a.size = new.size)
    and a.user_id <> new.owner_id
    and public.is_active_user(a.user_id)
    and not public.is_blocked_between(a.user_id, new.owner_id);

  return null;
end;
$$;

create trigger pets_after_insert_alerts
  after insert on public.pets
  for each row execute function public.pets_after_insert_alerts();

-- Las funciones nuevas no se exponen por la API (la migración de permisos ya corrió).
revoke execute on function
  public.pet_alerts_before_insert(),
  public.pets_after_insert_alerts()
from public, anon, authenticated;
