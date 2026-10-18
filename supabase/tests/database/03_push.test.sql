-- Pruebas de las notificaciones al celular (Web Push).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

\set uno '''b1111111-1111-1111-1111-111111111111'''
\set dos '''b2222222-2222-2222-2222-222222222222'''
insert into auth.users (id, email, raw_user_meta_data) values
  (:uno, 'uno-push@test.cl', '{"display_name":"Uno"}'),
  (:dos, 'dos-push@test.cl', '{"display_name":"Dos"}');
update public.profiles set commune_code = '13101', terms_accepted_at = now(), adult_confirmed_at = now() where id in (:uno, :dos);

select ok(not has_function_privilege('authenticated', 'public.notifications_after_insert_push()', 'execute'), 'el disparador no se expone por la API');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'la configuración privada no es accesible desde la API');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :uno, 'role', 'authenticated')::text, true);
select throws_ok($$ insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/x', 'k', 'a') $$,
  '42501', null, 'no se puede insertar directamente');
select lives_ok($$ select public.save_push_subscription('https://push.example/uno', 'clave', 'auth') $$, 'puedo activar avisos en mi celular');
select is((select count(*)::int from public.push_subscriptions), 1, 'veo mi dispositivo');

select set_config('request.jwt.claims', json_build_object('sub', :dos, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.push_subscriptions), 0, 'no veo los dispositivos de otra persona');
select lives_ok($$ select public.save_push_subscription('https://push.example/uno', 'clave2', 'auth2') $$, 'un celular compartido pasa a la cuenta que inició sesión');
select is((select count(*)::int from public.push_subscriptions), 1, 'ahora el dispositivo es mío');
reset role;

-- Sin configuración no se encola nada; con configuración, cada notificación se envía al sitio.
select public.notify(:dos, 'test', 'Hola sin configurar');
select is((select count(*)::int from net.http_request_queue), 0, 'sin configuración no se llama al sitio');
insert into private.push_config (url, secret) values ('https://www.ayudapatitas.cl/api/push', 'secreto-de-prueba-de-24-caracteres');
select public.notify(:dos, 'test', 'Hola configurado');
select is((select count(*)::int from net.http_request_queue where url = 'https://www.ayudapatitas.cl/api/push'), 1, 'con configuración se pide el envío del aviso');

select * from finish();
rollback;
