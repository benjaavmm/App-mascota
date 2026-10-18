-- =============================================================================
-- AyudaPatitas · Notificaciones al celular (Web Push)
-- Cada notificación nueva dispara una llamada a /api/push del sitio, que la envía
-- a los navegadores donde la persona activó los avisos.
-- =============================================================================

create extension if not exists pg_net;

-- Dispositivos (navegadores) donde cada persona activó las notificaciones.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Ver mis dispositivos" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Quitar mis dispositivos" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Guarda (o mueve) un dispositivo a la cuenta actual. Si el navegador ya estaba
-- asociado a otra cuenta (celular compartido), pasa a la cuenta que inició sesión.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
begin
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
  -- Máximo 10 dispositivos por persona: se descartan los más antiguos.
  delete from public.push_subscriptions s
  where s.user_id = v_uid
    and s.id not in (select x.id from public.push_subscriptions x where x.user_id = v_uid order by x.created_at desc limit 10);
end;
$$;

-- Configuración privada (fuera de la API): dirección de envío y secreto compartido con el sitio.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.push_config (
  id boolean primary key default true check (id),
  url text not null check (url ~ '^https?://'),
  secret text not null check (char_length(secret) >= 24)
);

-- Al crearse una notificación, pide al sitio que la envíe. Nunca impide crear la notificación.
create function public.notifications_after_insert_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg record;
begin
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
    return null;
  end if;
  select url, secret into v_cfg from private.push_config where id;
  if v_cfg.url is null then
    return null;
  end if;
  perform net.http_post(
    url := v_cfg.url,
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_cfg.secret),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  raise warning 'No se pudo encolar el aviso push: %', sqlerrm;
  return null;
end;
$$;

create trigger notifications_after_insert_push
  after insert on public.notifications
  for each row execute function public.notifications_after_insert_push();

revoke execute on function
  public.save_push_subscription(text, text, text, text),
  public.notifications_after_insert_push()
from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
