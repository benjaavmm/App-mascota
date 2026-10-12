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
