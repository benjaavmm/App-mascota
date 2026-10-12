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
