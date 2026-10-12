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
