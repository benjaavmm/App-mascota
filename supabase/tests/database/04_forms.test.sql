-- Pruebas del formulario de adopción propio (preguntas extra y formulario externo).
-- Ejecutar con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

\set ana  '''f1111111-1111-1111-1111-111111111111'''
\set beto '''f2222222-2222-2222-2222-222222222222'''
\set cata '''f3333333-3333-3333-3333-333333333333'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:ana,  'ana-form@test.cl',  '{"display_name":"Fundación Ana"}'),
  (:beto, 'beto-form@test.cl', '{"display_name":"Beto"}'),
  (:cata, 'cata-form@test.cl', '{"display_name":"Cata"}');
update public.profiles set commune_code = '13101', terms_accepted_at = now(), adult_confirmed_at = now()
where id in (:ana, :beto, :cata);

select ok(not has_function_privilege('authenticated', 'public.applications_form_before_insert()', 'execute'),
  'la función del formulario no se expone por la API');

-- -----------------------------------------------------------------------------
-- Guardar el formulario
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :ana, 'role', 'authenticated')::text, true);

select throws_ok($$ insert into public.adoption_forms (owner_id) values ('f1111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'no se puede escribir directo en la tabla');
select throws_ok($$ select public.save_adoption_form('https://estafa.cl/formulario', null, '[]') $$,
  '23514', null, 'solo se aceptan servicios de formularios conocidos');
select throws_ok($$ select public.save_adoption_form(null, null,
    (select jsonb_agg(jsonb_build_object('label', 'Pregunta ' || i, 'kind', 'short')) from generate_series(1, 11) i)) $$,
  '54000', null, 'máximo 10 preguntas propias');
select throws_ok($$ select public.save_adoption_form(null, null,
    '[{"label":"¿Dónde vives?","kind":"choice","options":["Casa"]}]') $$,
  '23514', null, 'las preguntas de opciones necesitan al menos 2 opciones');
select lives_ok($$ select public.save_adoption_form(null, 'Solo entregamos en la RM.',
    '[{"label":"¿Tienes mallas en las ventanas?","kind":"yesno","required":true},
      {"label":"¿Dónde vives?","kind":"choice","options":["Casa","Departamento"],"required":false}]') $$,
  'se guardan preguntas propias');
select is((select count(*)::int from public.adoption_form_questions where owner_id = :ana), 2,
  'las preguntas quedan guardadas en orden');

insert into public.pets (species, name, sex, size, description, commune_code, breed) values
  ('cat', 'Nube Form', 'female', 'small', 'Gatita tranquila rescatada de la calle, busca un hogar con paciencia.', '13101', 'Mestiza'),
  ('dog', 'Toby Form', 'male', 'medium', 'Perrito juguetón y cariñoso, ideal para una familia activa.', '13101', 'Mestizo');
reset role;

-- -----------------------------------------------------------------------------
-- Postular con preguntas propias
-- -----------------------------------------------------------------------------
create temp table base_answers as
select 'house'::public.housing_type as housing_type, 'owned'::public.housing_tenure as housing_tenure,
  true as has_secure_yard, 2::smallint as adults_count, true as household_agrees, 3::smallint as hours_alone,
  'Siempre he tenido gatos rescatados.'::text as experience,
  'Quiero darle un hogar definitivo, trabajo desde casa y tengo mucho tiempo para acompañarla.'::text as motivation,
  'Mi familia la cuidaría si viajo.'::text as care_plan;
grant select on base_answers to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :beto, 'role', 'authenticated')::text, true);
select throws_like($$
  insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard, adults_count, household_agrees,
    hours_alone, experience, motivation, care_plan, commits_vet_care, commits_sterilization, accepts_followup,
    commits_return_not_abandon, custom_answers)
  select (select id from public.pets where name = 'Nube Form'), b.*, true, true, true, true, '{}'::jsonb from base_answers b $$,
  'Responde la pregunta:%', 'las preguntas obligatorias se deben responder');
select throws_like($$
  insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard, adults_count, household_agrees,
    hours_alone, experience, motivation, care_plan, commits_vet_care, commits_sterilization, accepts_followup,
    commits_return_not_abandon, custom_answers)
  select (select id from public.pets where name = 'Nube Form'), b.*, true, true, true, true,
    jsonb_build_object((select id from public.adoption_form_questions where label like '%mallas%')::text, 'Quizás')
  from base_answers b $$,
  'Elige una opción válida%', 'las respuestas de sí o no se validan');
select throws_ok($$
  insert into public.applications (pet_id, commits_vet_care, commits_sterilization, accepts_followup,
    commits_return_not_abandon, custom_answers)
  values ((select id from public.pets where name = 'Nube Form'), true, true, true, true,
    jsonb_build_object((select id from public.adoption_form_questions where label like '%mallas%')::text, 'Sí')) $$,
  '23514', null, 'sin formulario externo el cuestionario base es obligatorio');
select lives_ok($$
  insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard, adults_count, household_agrees,
    hours_alone, experience, motivation, care_plan, commits_vet_care, commits_sterilization, accepts_followup,
    commits_return_not_abandon, custom_answers)
  select (select id from public.pets where name = 'Nube Form'), b.*, true, true, true, true,
    jsonb_build_object((select id from public.adoption_form_questions where label like '%mallas%')::text, 'Sí')
  from base_answers b $$,
  'se postula respondiendo las preguntas propias');
select is(
  (select custom_answers from public.applications where applicant_id = :beto),
  '[{"question":"¿Tienes mallas en las ventanas?","answer":"Sí"}]'::jsonb,
  'la solicitud guarda una copia de cada pregunta con su respuesta');

-- Otra persona guarda su formulario: solo cambia el suyo.
select lives_ok($$ select public.save_adoption_form('https://forms.gle/beto123', null, '[]') $$,
  'cualquiera puede tener su propio formulario');
reset role;

-- -----------------------------------------------------------------------------
-- Postular con formulario externo
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :ana, 'role', 'authenticated')::text, true);
select lives_ok($$ select public.save_adoption_form('https://docs.google.com/forms/d/e/abc123/viewform', null, '[]') $$,
  'se puede usar un formulario de Google');
select is((select count(*)::int from public.adoption_form_questions where owner_id = :ana), 0,
  'al cambiar de formulario se reemplazan las preguntas');

select set_config('request.jwt.claims', json_build_object('sub', :cata, 'role', 'authenticated')::text, true);
select throws_like($$
  insert into public.applications (pet_id, commits_vet_care, commits_sterilization, accepts_followup, commits_return_not_abandon)
  values ((select id from public.pets where name = 'Toby Form'), true, true, true, true) $$,
  'Confirma que completaste%', 'hay que confirmar que se completó el formulario externo');
select lives_ok($$
  insert into public.applications (pet_id, commits_vet_care, commits_sterilization, accepts_followup,
    commits_return_not_abandon, external_form_confirmed, applicant_note)
  values ((select id from public.pets where name = 'Toby Form'), true, true, true, true, true, '  Lo llené como Catalina.  ') $$,
  'con formulario externo no se pide el cuestionario base');
select is(
  (select external_form_url || ' | ' || applicant_note from public.applications where applicant_id = :cata),
  'https://docs.google.com/forms/d/e/abc123/viewform | Lo llené como Catalina.',
  'la solicitud guarda el enlace del formulario y el mensaje limpio');
reset role;

select * from finish();
rollback;
