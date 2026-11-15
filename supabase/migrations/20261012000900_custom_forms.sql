-- =============================================================================
-- AyudaPatitas · Formulario de adopción propio
-- Cada persona o fundación que publica puede:
--   1) agregar sus propias preguntas al cuestionario de AyudaPatitas, o
--   2) usar su propio formulario externo (Google Forms, Microsoft Forms, Typeform,
--      Jotform o Tally). En ese caso quien postula lo completa allá y en la app solo
--      confirma que lo hizo y acepta los compromisos de adopción responsable.
-- La conversación, el acta y los seguimientos siguen funcionando igual.
-- =============================================================================

create table public.adoption_forms (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  -- Solo servicios de formularios conocidos, para evitar enlaces engañosos.
  external_url text check (
    char_length(external_url) <= 500
    and external_url ~ '^https://(docs\.google\.com/forms/|forms\.gle/|forms\.office\.com/|forms\.microsoft\.com/|([a-z0-9-]+\.)?typeform\.com/|(form\.)?jotform\.com/|tally\.so/)[^[:space:]<>"'']*$'
  ),
  intro text check (char_length(intro) <= 600),
  updated_at timestamptz not null default now()
);

-- Opciones válidas para preguntas de selección: 2 a 8, cada una de 1 a 80 caracteres.
create function public.valid_form_options(p_options text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select cardinality(p_options) between 2 and 8
    and not exists (select 1 from unnest(p_options) o where o is null or char_length(o) not between 1 and 80);
$$;

create table public.adoption_form_questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.adoption_forms (owner_id) on delete cascade,
  position smallint not null check (position between 0 and 9),
  label text not null check (char_length(label) between 3 and 200),
  kind text not null check (kind in ('short', 'long', 'yesno', 'choice')),
  options text[],
  required boolean not null default true,
  unique (owner_id, position),
  check ((kind = 'choice' and public.valid_form_options(options)) or (kind <> 'choice' and options is null))
);

alter table public.adoption_forms enable row level security;
alter table public.adoption_form_questions enable row level security;

-- El formulario es público: quien postula necesita verlo. Solo se modifica con save_adoption_form.
create policy "Formularios visibles" on public.adoption_forms for select to anon, authenticated using (true);
create policy "Preguntas visibles" on public.adoption_form_questions for select to anon, authenticated using (true);

revoke all on public.adoption_forms, public.adoption_form_questions from anon, authenticated;
grant select on public.adoption_forms, public.adoption_form_questions to anon, authenticated;

-- Guarda el formulario completo de la persona actual (reemplaza las preguntas anteriores).
create function public.save_adoption_form(p_external_url text, p_intro text, p_questions jsonb default '[]')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_act();
  v_question jsonb;
  v_position smallint := 0;
  v_kind text;
begin
  p_questions := coalesce(p_questions, '[]'::jsonb);
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'Las preguntas no son válidas.' using errcode = '23514';
  end if;
  if jsonb_array_length(p_questions) > 10 then
    raise exception 'Puedes agregar hasta 10 preguntas propias.' using errcode = '54000';
  end if;

  insert into public.adoption_forms (owner_id, external_url, intro, updated_at)
  values (v_uid, public.clean_text(p_external_url), public.clean_text(p_intro), now())
  on conflict (owner_id) do update
    set external_url = excluded.external_url, intro = excluded.intro, updated_at = now();

  delete from public.adoption_form_questions where owner_id = v_uid;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    v_kind := v_question ->> 'kind';
    insert into public.adoption_form_questions (owner_id, position, label, kind, options, required)
    values (
      v_uid,
      v_position,
      public.clean_text(v_question ->> 'label'),
      v_kind,
      case when v_kind = 'choice' then
        array(select public.clean_text(o) from jsonb_array_elements_text(coalesce(v_question -> 'options', '[]'::jsonb)) o
              where public.clean_text(o) is not null)
      end,
      coalesce((v_question ->> 'required')::boolean, true)
    );
    v_position := v_position + 1;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Solicitudes: respuestas propias y formulario externo
-- -----------------------------------------------------------------------------
alter table public.applications
  add column custom_answers jsonb not null default '[]'::jsonb,
  add column external_form_url text,
  add column external_form_confirmed boolean,
  add column applicant_note text check (char_length(applicant_note) <= 1000);

-- Con formulario externo, el cuestionario de AyudaPatitas no se pide (las respuestas están allá).
alter table public.applications
  alter column housing_type drop not null,
  alter column housing_tenure drop not null,
  alter column has_secure_yard drop not null,
  alter column adults_count drop not null,
  alter column household_agrees drop not null,
  alter column hours_alone drop not null,
  alter column experience drop not null,
  alter column motivation drop not null,
  alter column care_plan drop not null;

alter table public.applications
  add constraint applications_questionnaire_check check (
    external_form_url is not null or (
      housing_type is not null and housing_tenure is not null and has_secure_yard is not null
      and adults_count is not null and household_agrees is not null and hours_alone is not null
      and experience is not null and motivation is not null and care_plan is not null
    )
  ),
  add constraint applications_external_form_check check (external_form_url is null or external_form_confirmed),
  add constraint applications_custom_answers_check check (
    jsonb_typeof(custom_answers) = 'array' and pg_column_size(custom_answers) <= 30000
  );

-- Corre después de applications_before_insert (orden alfabético), cuando publisher_id ya está asignado.
-- Recibe custom_answers como objeto {id_pregunta: respuesta} y guarda una copia con el texto de cada pregunta.
create function public.applications_form_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_given jsonb := coalesce(new.custom_answers, '{}'::jsonb);
  v_out jsonb := '[]'::jsonb;
  v_answer text;
  q record;
begin
  new.applicant_note := public.clean_text(new.applicant_note);
  select f.external_url into v_url from public.adoption_forms f where f.owner_id = new.publisher_id;

  if v_url is not null then
    if not coalesce(new.external_form_confirmed, false) then
      raise exception 'Confirma que completaste el formulario de quien publica.' using errcode = '23514';
    end if;
    new.external_form_url := v_url;
    new.custom_answers := '[]'::jsonb;
    return new;
  end if;

  new.external_form_url := null;
  new.external_form_confirmed := null;
  if jsonb_typeof(v_given) <> 'object' then
    v_given := '{}'::jsonb;
  end if;
  for q in
    select * from public.adoption_form_questions where owner_id = new.publisher_id order by position
  loop
    v_answer := public.clean_text(v_given ->> q.id::text);
    if v_answer is null then
      if q.required then
        raise exception 'Responde la pregunta: %', q.label using errcode = '23514';
      end if;
      continue;
    end if;
    if char_length(v_answer) > (array[300, 1500])[(q.kind = 'long')::int + 1] then
      raise exception 'La respuesta a "%" es demasiado larga.', q.label using errcode = '23514';
    end if;
    if (q.kind = 'yesno' and v_answer not in ('Sí', 'No')) or (q.kind = 'choice' and not v_answer = any (q.options)) then
      raise exception 'Elige una opción válida en: %', q.label using errcode = '23514';
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('question', q.label, 'answer', v_answer));
  end loop;
  new.custom_answers := v_out;
  return new;
end;
$$;

create trigger applications_form_before_insert
  before insert on public.applications
  for each row execute function public.applications_form_before_insert();

grant insert (custom_answers, external_form_confirmed, applicant_note) on public.applications to authenticated;

revoke execute on function
  public.save_adoption_form(text, text, jsonb),
  public.applications_form_before_insert()
from public, anon, authenticated;
grant execute on function public.save_adoption_form(text, text, jsonb) to authenticated;
grant execute on function public.valid_form_options(text[]) to anon, authenticated;
