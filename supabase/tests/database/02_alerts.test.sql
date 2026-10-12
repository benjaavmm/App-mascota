-- Pruebas de las alertas de búsqueda.
-- Ejecutar con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

\set ana   '''a1111111-1111-1111-1111-111111111111'''
\set beto  '''a2222222-2222-2222-2222-222222222222'''
\set cata  '''a3333333-3333-3333-3333-333333333333'''
\set dani  '''a4444444-4444-4444-4444-444444444444'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:ana,  'ana-alertas@test.cl',  '{"display_name":"Ana"}'),
  (:beto, 'beto-alertas@test.cl', '{"display_name":"Beto"}'),
  (:cata, 'cata-alertas@test.cl', '{"display_name":"Cata"}'),
  (:dani, 'dani-alertas@test.cl', '{"display_name":"Dani"}');
update public.profiles set commune_code = '13101', terms_accepted_at = now(), adult_confirmed_at = now()
where id in (:ana, :beto, :cata);

select ok(not has_function_privilege('authenticated', 'public.pets_after_insert_alerts()', 'execute'),
  'la función de alertas no se expone por la API');

-- -----------------------------------------------------------------------------
-- Crear alertas
-- -----------------------------------------------------------------------------
set local role anon;
select throws_ok($$ insert into public.pet_alerts (kind) values ('adoption') $$,
  '42501', null, 'visitantes no pueden crear alertas');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :dani, 'role', 'authenticated')::text, true);
select throws_ok($$ insert into public.pet_alerts (kind) values ('adoption') $$,
  '42501', null, 'sin perfil completo no se pueden crear alertas');

select set_config('request.jwt.claims', json_build_object('sub', :ana, 'role', 'authenticated')::text, true);
select lives_ok($$ insert into public.pet_alerts (kind, species, commune_code) values ('adoption', 'cat', '13120') $$,
  'puedo crear una alerta de gatos en Ñuñoa');
select is((select region_code from public.pet_alerts where user_id = auth.uid()), '13',
  'la región se completa desde la comuna');
select throws_ok($$ insert into public.pet_alerts (kind, species, commune_code) values ('adoption', 'cat', '13120') $$,
  '23505', null, 'no se duplican alertas idénticas');
select throws_ok($$ insert into public.pet_alerts (user_id, kind) values ('a2222222-2222-2222-2222-222222222222', 'lost') $$,
  '42501', null, 'no puedo crear alertas a nombre de otra persona');
select lives_ok($$ insert into public.pet_alerts (kind, species, region_code) values ('lost', 'dog', '13') $$,
  'puedo crear una alerta de perros perdidos en la región');

select set_config('request.jwt.claims', json_build_object('sub', :beto, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.pet_alerts), 0, 'no veo las alertas de otras personas');
select lives_ok($$ insert into public.pet_alerts (kind, species, size) values ('adoption', 'cat', 'large') $$,
  'otra persona crea una alerta de gatos grandes');
select lives_ok($$ insert into public.pet_alerts (kind) values ('found') $$,
  'alerta amplia de animales encontrados');
insert into public.pet_alerts (kind, region_code)
  select 'found', r.code from public.regions r where r.code <> '13' order by r.code limit 8;
select throws_ok($$ insert into public.pet_alerts (kind, region_code) values ('found', '13') $$,
  '54000', null, 'máximo 10 alertas por persona');
reset role;

-- -----------------------------------------------------------------------------
-- Avisos al publicar
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :cata, 'role', 'authenticated')::text, true);
insert into public.pets (species, name, sex, size, description, commune_code, breed)
values ('cat', 'Michi Alerta', 'male', 'small', 'Gatito rescatado de un techo, curioso y muy regalón.', '13120', 'Mestizo');
reset role;

select is(
  (select count(*)::int from public.notifications where user_id = :ana and type = 'pet_alert'),
  1, 'avisa a quien tiene una alerta que coincide');
select is(
  (select count(*)::int from public.notifications where user_id = :beto and type = 'pet_alert'),
  0, 'no avisa si el tamaño no coincide');
select ok(
  (select link from public.notifications where user_id = :ana and type = 'pet_alert')
    = '/mascotas/' || (select id from public.pets where name = 'Michi Alerta'),
  'la notificación enlaza a la publicación');

-- Bloqueos: si Ana bloquea a Cata, no recibe avisos de sus publicaciones.
insert into public.blocks (blocker_id, blocked_id) values (:ana, :cata);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :cata, 'role', 'authenticated')::text, true);
insert into public.pets (species, name, sex, size, description, commune_code, breed)
values ('cat', 'Pelusa Alerta', 'female', 'small', 'Gatita tranquila que busca un hogar con mucho cariño.', '13120', 'Mestiza');
reset role;
select is(
  (select count(*)::int from public.notifications where user_id = :ana and type = 'pet_alert'),
  1, 'no avisa entre personas bloqueadas');

-- Quien publica no recibe avisos de su propia publicación.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :ana, 'role', 'authenticated')::text, true);
insert into public.pets (kind, species, name, sex, size, description, commune_code, breed)
values ('lost', 'dog', 'Bobby Alerta', 'male', 'medium', 'Se perdió cerca de la plaza, tiene collar rojo y es muy amistoso.', '13101', 'Mestizo');
reset role;
select is(
  (select count(*)::int from public.notifications where user_id = :ana and type = 'pet_alert'),
  1, 'no avisa a quien publica');

select * from finish();
rollback;
