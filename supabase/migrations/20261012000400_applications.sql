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
