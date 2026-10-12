-- =============================================================================
-- Huellitas · Publicaciones de perritos (adopción, perdidos y encontrados),
-- fotos y favoritos.
-- =============================================================================

create type public.listing_kind as enum ('adoption', 'lost', 'found');
create type public.dog_status as enum ('available', 'in_process', 'adopted', 'reunited', 'paused', 'archived');
create type public.dog_sex as enum ('male', 'female', 'unknown');
create type public.dog_size as enum ('small', 'medium', 'large', 'giant');
create type public.energy_level as enum ('low', 'medium', 'high');

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.listing_kind not null default 'adoption',
  status public.dog_status not null default 'available',
  name text not null check (char_length(name) between 1 and 40),
  sex public.dog_sex not null default 'unknown',
  size public.dog_size not null,
  birth_date_estimate date,
  breed text not null default 'Mestizo' check (char_length(breed) between 1 and 60),
  color text check (char_length(color) <= 60),
  weight_kg numeric(4, 1) check (weight_kg is null or weight_kg between 0.3 and 120),
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

comment on column public.dogs.location_hint is
  'Referencia aproximada (sector, plaza). Nunca una dirección exacta.';
comment on column public.dogs.event_date is
  'Para perdidos/encontrados: fecha en que se perdió o se encontró.';

create index dogs_feed_idx on public.dogs (created_at desc) where not hidden;
create index dogs_status_kind_idx on public.dogs (status, kind);
create index dogs_owner_idx on public.dogs (owner_id);
create index dogs_commune_idx on public.dogs (commune_code);
create index dogs_region_idx on public.dogs (region_code);
create index dogs_search_idx on public.dogs using gin (search_vector);

-- -----------------------------------------------------------------------------
-- Validaciones y reglas de negocio de las publicaciones
-- -----------------------------------------------------------------------------
create function public.dogs_before_write()
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
     and (new.birth_date_estimate > current_date or new.birth_date_estimate < current_date - interval '25 years') then
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
    || setweight(to_tsvector('spanish', public.normalize_text(concat_ws(' ', new.breed, new.color, v_commune_name))), 'B')
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
    select count(*) into v_recent from public.dogs d
    where d.owner_id = v_uid and d.created_at > now() - interval '24 hours';
    if v_recent >= (case when v_verified then 30 else 5 end) then
      raise exception 'Alcanzaste el límite de publicaciones por día. Intenta mañana.' using errcode = '54000';
    end if;

    select count(*) into v_active from public.dogs d
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
      raise exception 'Estado no válido para un perrito perdido o encontrado.' using errcode = '23514';
    end if;
    if new.status in ('available', 'paused', 'archived', 'adopted')
       and exists (
         select 1 from public.applications a
         where a.dog_id = new.id and a.status = 'approved'
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

create trigger dogs_before_write
  before insert or update on public.dogs
  for each row execute function public.dogs_before_write();

create trigger dogs_set_updated_at
  before update on public.dogs
  for each row execute function public.set_updated_at();

-- Al publicar un perrito encontrado, avisar a quienes buscan uno perdido parecido.
create function public.dogs_after_insert_match()
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
    from public.dogs d
    where d.kind = 'lost'
      and d.status = 'available'
      and not d.hidden
      and d.region_code = new.region_code
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
      'Publicaron un perrito encontrado con características parecidas en tu región. Revísalo con calma y pide pruebas antes de coordinar.',
      '/perritos/' || new.id
    );
  end loop;

  return null;
end;
$$;

create trigger dogs_after_insert_match
  after insert on public.dogs
  for each row execute function public.dogs_after_insert_match();

-- -----------------------------------------------------------------------------
-- Seguridad de filas (RLS)
-- -----------------------------------------------------------------------------
alter table public.dogs enable row level security;

create policy "Publicaciones visibles para todos" on public.dogs
  for select to anon, authenticated
  using (
    not hidden
    and status in ('available', 'in_process', 'adopted', 'reunited')
    and public.is_active_user(owner_id)
  );

create policy "Veo mis publicaciones" on public.dogs
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Moderación ve todas las publicaciones" on public.dogs
  for select to authenticated
  using ((select public.is_moderator()));

create policy "Publicar perritos" on public.dogs
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Editar mis publicaciones" on public.dogs
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.dogs from anon, authenticated;
grant select on public.dogs to anon, authenticated;
grant insert (
  kind, name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy,
  good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized,
  microchipped, special_needs, health_notes, requirements, commune_code, location_hint,
  event_date, is_urgent
) on public.dogs to authenticated;
grant update (
  name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy,
  good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized,
  microchipped, special_needs, health_notes, requirements, commune_code, location_hint,
  event_date, is_urgent, status
) on public.dogs to authenticated;

-- -----------------------------------------------------------------------------
-- Fotos
-- -----------------------------------------------------------------------------
create table public.dog_photos (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  position smallint not null default 0 check (position between 0 and 50),
  created_at timestamptz not null default now()
);

create index dog_photos_dog_idx on public.dog_photos (dog_id, position);

create function public.dog_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  select d.owner_id into v_owner from public.dogs d where d.id = new.dog_id;
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

  -- Las fotos deben estar en la carpeta {dueño}/{perrito}/ del bucket.
  if new.storage_path not like v_owner::text || '/' || new.dog_id::text || '/%' then
    raise exception 'Ruta de foto no válida.' using errcode = '23514';
  end if;

  if (select count(*) from public.dog_photos p where p.dog_id = new.dog_id) >= 8 then
    raise exception 'Máximo 8 fotos por publicación.' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger dog_photos_before_insert
  before insert on public.dog_photos
  for each row execute function public.dog_photos_before_insert();

-- Mantiene la foto de portada (la de menor posición).
create function public.dog_photos_refresh_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dog_id uuid := coalesce(new.dog_id, old.dog_id);
  v_cover text;
begin
  select p.storage_path into v_cover
  from public.dog_photos p
  where p.dog_id = v_dog_id
  order by p.position, p.created_at
  limit 1;

  update public.dogs d set cover_path = v_cover
  where d.id = v_dog_id and d.cover_path is distinct from v_cover;
  return null;
end;
$$;

create trigger dog_photos_refresh_cover
  after insert or update or delete on public.dog_photos
  for each row execute function public.dog_photos_refresh_cover();

alter table public.dog_photos enable row level security;

-- Una foto es visible si la publicación es visible para quien consulta.
create policy "Fotos visibles si la publicación lo es" on public.dog_photos
  for select to anon, authenticated
  using (exists (select 1 from public.dogs d where d.id = dog_photos.dog_id));

create policy "Subir fotos a mis publicaciones" on public.dog_photos
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Ordenar mis fotos" on public.dog_photos
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Borrar mis fotos" on public.dog_photos
  for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.dog_photos from anon, authenticated;
grant select on public.dog_photos to anon, authenticated;
grant insert (dog_id, storage_path, position) on public.dog_photos to authenticated;
grant update (position) on public.dog_photos to authenticated;
grant delete on public.dog_photos to authenticated;

-- -----------------------------------------------------------------------------
-- Favoritos
-- -----------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, dog_id)
);

create index favorites_dog_idx on public.favorites (dog_id);

alter table public.favorites enable row level security;

create policy "Ver mis favoritos" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Agregar favoritos" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Quitar favoritos" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (dog_id) on public.favorites to authenticated;
