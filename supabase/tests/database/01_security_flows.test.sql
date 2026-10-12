-- Pruebas de seguridad (RLS, permisos por columna) y del flujo completo de adopción.
-- Ejecutar con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(95);

-- -----------------------------------------------------------------------------
-- Preparación: personas de prueba
-- -----------------------------------------------------------------------------
\set alice '''11111111-1111-1111-1111-111111111111'''
\set bruno '''22222222-2222-2222-2222-222222222222'''
\set carla '''33333333-3333-3333-3333-333333333333'''
\set mod   '''44444444-4444-4444-4444-444444444444'''
\set diego '''55555555-5555-5555-5555-555555555555'''
\set nuevo '''66666666-6666-6666-6666-666666666666'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:alice, 'alice@test.cl', '{"display_name":"Alice Rescatista"}'),
  (:bruno, 'bruno@test.cl', '{"display_name":"Bruno"}'),
  (:carla, 'carla@test.cl', '{"display_name":"Carla"}'),
  (:mod,   'mod@test.cl',   '{"display_name":"Mod"}'),
  (:diego, 'diego@test.cl', '{"display_name":"Diego"}'),
  (:nuevo, 'nuevo@test.cl', '{"display_name":"x"}');

select ok(has_function_privilege('authenticated', 'public.clean_text(text)', 'execute'),
  'los triggers que corren como la persona pueden limpiar textos');
select ok(not has_function_privilege('authenticated', 'public.notify(uuid, text, text, text, text)', 'execute'),
  'las funciones internas no son ejecutables desde la API');
select is((select count(*)::int from public.profiles where id in (:alice, :bruno, :carla, :mod, :diego, :nuevo)), 6,
  'el registro crea perfiles automáticamente');
select is((select display_name from public.profiles where id = :nuevo), 'Persona 666666',
  'un nombre inválido se reemplaza por uno genérico');

update public.profiles set commune_code = '13101', terms_accepted_at = now(), adult_confirmed_at = now()
where id in (:alice, :bruno, :carla, :mod, :diego);
update public.profiles set role = 'moderator' where id = :mod;
update public.profile_private set phone = '+56 9 1234 5678' where user_id = :alice;

-- -----------------------------------------------------------------------------
-- Perfiles
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);

select lives_ok($$ update public.profiles set bio = 'Me encantan los perros' where id = '22222222-2222-2222-2222-222222222222' $$,
  'puedo editar mi biografía');
select throws_ok($$ update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'no puedo cambiar mi rol');
select throws_ok($$ update public.profiles set verification_status = 'verified' where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'no puedo autoverificarme');
select throws_ok($$ update public.profiles set account_status = 'active' where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'no puedo levantar una suspensión');
update public.profiles set bio = 'hackeado' where id = :alice;
select is((select count(*)::int from public.profile_private), 1, 'solo veo mis datos privados');
select is((select phone from public.profile_private where user_id = :alice), null, 'no veo el teléfono de otra persona');
select throws_ok($$ select public.notify('22222222-2222-2222-2222-222222222222', 'x', 'y') $$,
  '42501', null, 'no puedo ejecutar funciones internas');
select throws_ok($$ select public.is_blocked_between('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'no puedo consultar bloqueos ajenos');

reset role;
select is((select bio from public.profiles where id = :alice), null, 'no puedo editar el perfil de otra persona');

-- -----------------------------------------------------------------------------
-- Publicaciones
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :nuevo, 'role', 'authenticated')::text, true);
select throws_ok($$ insert into public.pets (name, size, description, commune_code)
  values ('Toby', 'small', 'Perrito encontrado en la plaza, muy dócil y tranquilo', '13101') $$,
  '42501', null, 'sin perfil completo no se puede publicar');

select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select lives_ok($$ insert into public.pets (name, sex, size, description, commune_code, breed)
  values ('Canelita QA', 'female', 'medium', 'Perrita rescatada de la calle, muy cariñosa y tranquila.', '13120', 'Mestiza') $$,
  'una persona con perfil completo puede publicar');
select throws_ok($$ insert into public.pets (name, size, description, commune_code, hidden)
  values ('Rex', 'large', 'Perro grande y juguetón que busca un hogar responsable.', '13101', true) $$,
  '42501', null, 'no puedo crear publicaciones ocultas/moderadas');
select lives_ok($$ insert into public.pets (kind, name, size, description, commune_code)
  values ('lost', 'Pelusa QA', 'small', 'Se perdió cerca del metro, tiene collar rojo y es asustadiza.', '13101') $$,
  'puedo publicar un perrito perdido');

reset role;
select id as pet1 from public.pets where name = 'Canelita QA' \gset
select id as lostpet from public.pets where name = 'Pelusa QA' \gset
select is((select owner_id from public.pets where id = :'pet1'), :alice::uuid, 'el dueño se asigna automáticamente');
select is((select region_code from public.pets where id = :'pet1'), '13', 'la región se deriva de la comuna');
select ok((select search_vector @@ websearch_to_tsquery('spanish', 'carinosa nunoa') from public.pets where id = :'pet1'),
  'la búsqueda ignora tildes y encuentra por comuna');

set local role anon;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from public.pets where id in (:'pet1', :'lostpet')), 2, 'visitantes ven publicaciones disponibles');
select throws_ok($$ insert into public.pets (name, size, description, commune_code)
  values ('Spam', 'small', 'Esto no debería poder publicarse sin una cuenta válida.', '13101') $$,
  '42501', null, 'visitantes no pueden publicar');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
update public.pets set name = 'Robado' where id = :'pet1';
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select throws_ok(format($$ update public.pets set owner_id = %L where id = %L $$, :carla, :'pet1'),
  '42501', null, 'no se puede traspasar la publicación');
select throws_ok(format($$ update public.pets set status = 'reunited' where id = %L $$, :'pet1'),
  '23514', null, 'una adopción no puede quedar como "reencontrado"');
select lives_ok(format($$ update public.pets set status = 'paused' where id = %L $$, :'pet1'),
  'puedo pausar mi publicación');

reset role;
select is((select name from public.pets where id = :'pet1'), 'Canelita QA', 'otra persona no puede editar mi publicación');

set local role anon;
select is((select count(*)::int from public.pets where id = :'pet1'), 0, 'una publicación pausada no es pública');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
update public.pets set status = 'available' where id = :'pet1';

-- Fotos
select throws_ok(format($$ insert into public.pet_photos (pet_id, storage_path) values (%L, 'otra/ruta/foto.jpg') $$, :'pet1'),
  '23514', null, 'la ruta de la foto debe estar en mi carpeta');
select lives_ok(format($$ insert into public.pet_photos (pet_id, storage_path, position) values (%L, %L, 0) $$,
  :'pet1', :alice || '/' || :'pet1' || '/a.jpg'), 'puedo agregar fotos a mi publicación');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner_id) values ('pet-photos', %L, %L) $$,
  :alice || '/' || :'pet1' || '/a.jpg', :alice), 'puedo subir el archivo de la foto a Storage');
select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select throws_ok(format($$ insert into public.pet_photos (pet_id, storage_path) values (%L, %L) $$,
  :'pet1', :carla || '/' || :'pet1' || '/b.jpg'), '42501', null, 'no puedo agregar fotos a publicaciones ajenas');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner_id) values ('pet-photos', %L, %L) $$,
  :carla || '/' || :'pet1' || '/b.jpg', :carla), '42501', null, 'no puedo subir archivos a carpetas de publicaciones ajenas');

reset role;
select is((select cover_path from public.pets where id = :'pet1'), :alice || '/' || :'pet1' || '/a.jpg',
  'la portada se actualiza con la primera foto');

-- -----------------------------------------------------------------------------
-- Mensajería
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select throws_ok(format($$ select public.start_conversation(%L) $$, :'pet1'), '23514', null,
  'no puedo iniciar una conversación conmigo');

select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);
select public.start_conversation(:'pet1') as conv1 \gset
select is(public.start_conversation(:'pet1'), :'conv1'::uuid, 'la conversación se reutiliza');
select lives_ok(format($$ insert into public.messages (conversation_id, body) values (%L, 'Hola! Me interesa Canela') $$, :'conv1'),
  'puedo escribir en mi conversación');
select lives_ok(format($$ insert into public.messages (conversation_id, body) values (%L, 'Te hago una transferencia de $20.000 para reservarla') $$, :'conv1'),
  'mensajes con dinero se permiten pero se marcan');
select is((select count(*)::int from public.messages where conversation_id = :'conv1' and safety_flag), 1,
  'se detectan mensajes de riesgo (dinero/transferencias)');
select throws_ok(format($$ insert into public.messages (conversation_id, body, kind) values (%L, 'falso', 'system') $$, :'conv1'),
  '42501', null, 'no puedo falsificar mensajes del sistema');
select is((select count(*)::int from public.get_conversation_contact(:'conv1')), 0,
  'no veo el contacto si la otra persona no lo compartió');

select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.messages where conversation_id = :'conv1'), 0, 'terceros no leen la conversación');
select is((select count(*)::int from public.conversations where id = :'conv1'), 0, 'terceros no ven la conversación');
select throws_ok(format($$ insert into public.messages (conversation_id, body) values (%L, 'intruso') $$, :'conv1'),
  '42501', null, 'terceros no pueden escribir');

select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select is((public.my_unread_counts() ->> 'messages')::int, 1, 'aparece una conversación sin leer');
select lives_ok(format($$ select public.mark_conversation_read(%L) $$, :'conv1'), 'puedo marcar como leída');
select is((public.my_unread_counts() ->> 'messages')::int, 0, 'ya no hay conversaciones sin leer');
select lives_ok(format($$ select public.share_contact(%L) $$, :'conv1'), 'puedo compartir mi contacto');

select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);
select is((select phone from public.get_conversation_contact(:'conv1')), '+56 9 1234 5678',
  'veo el contacto que la otra persona decidió compartir');

-- Bloqueos
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
insert into public.blocks (blocked_id) values (:bruno);
select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);
select throws_ok(format($$ insert into public.messages (conversation_id, body) values (%L, '¿Sigues ahí?') $$, :'conv1'),
  '42501', null, 'si me bloquean no puedo escribir');
select is((select count(*)::int from public.get_conversation_contact(:'conv1')), 0,
  'si me bloquean dejo de ver su contacto');
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
delete from public.blocks where blocked_id = :bruno;

-- -----------------------------------------------------------------------------
-- Solicitudes de adopción
-- -----------------------------------------------------------------------------
\set app_values '''house'', ''owned'', true, 2, 0, true, 4, ''Tuve perros toda mi vida'', ''Quiero darle un hogar definitivo, paseos diarios y mucho cariño a una perrita.'', ''Si viajo queda con mi familia'', true, true, true, true'

select throws_ok(format($$ insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard,
  adults_count, children_count, household_agrees, hours_alone, experience, motivation, care_plan, commits_vet_care,
  commits_sterilization, accepts_followup, commits_return_not_abandon) values (%L, %s) $$, :'pet1', :'app_values'),
  '23514', null, 'no puedo postular a mi propia publicación');

select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);
select throws_ok(format($$ insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard,
  adults_count, children_count, household_agrees, hours_alone, experience, motivation, care_plan, commits_vet_care,
  commits_sterilization, accepts_followup, commits_return_not_abandon) values (%L, %s) $$, :'lostpet', :'app_values'),
  '23514', null, 'no se postula a perritos perdidos');
select throws_ok(format($$ insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard,
  adults_count, children_count, household_agrees, hours_alone, experience, motivation, care_plan, commits_vet_care,
  commits_sterilization, accepts_followup, commits_return_not_abandon) values (%L, 'house', 'owned', true, 2, 0, true, 4,
  'Tuve perros', 'Quiero darle un hogar definitivo, paseos diarios y mucho cariño a una perrita.', 'Si viajo queda con mi familia',
  true, false, true, true) $$, :'pet1'),
  '23514', null, 'los compromisos de esterilización son obligatorios');
select lives_ok(format($$ insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard,
  adults_count, children_count, household_agrees, hours_alone, experience, motivation, care_plan, commits_vet_care,
  commits_sterilization, accepts_followup, commits_return_not_abandon) values (%L, %s) $$, :'pet1', :'app_values'),
  'puedo postular');
select throws_ok(format($$ insert into public.applications (pet_id, housing_type, housing_tenure, has_secure_yard,
  adults_count, children_count, household_agrees, hours_alone, experience, motivation, care_plan, commits_vet_care,
  commits_sterilization, accepts_followup, commits_return_not_abandon) values (%L, %s) $$, :'pet1', :'app_values'),
  '23505', null, 'no puedo postular dos veces al mismo perrito');

select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select lives_ok(format($$ insert into public.applications (pet_id, housing_type, housing_tenure, landlord_allows_pets, has_secure_yard,
  adults_count, children_count, household_agrees, hours_alone, experience, motivation, care_plan, commits_vet_care,
  commits_sterilization, accepts_followup, commits_return_not_abandon) values (%L, 'apartment', 'rented', true, false, 1, 0, true, 6,
  'Primera vez', 'Vivo sola y quiero compañía; tengo tiempo para pasearla todos los días.', 'Mi hermana me ayuda si viajo',
  true, true, true, true) $$, :'pet1'), 'otra persona también puede postular');

reset role;
select id as app_bruno from public.applications where applicant_id = :bruno \gset
select id as app_carla from public.applications where applicant_id = :carla \gset
select is((select conversation_id from public.applications where id = :'app_bruno'), :'conv1'::uuid,
  'la solicitud reutiliza la conversación existente');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.applications), 1, 'solo veo mis solicitudes');
select throws_ok(format($$ select public.review_application(%L, 'approved') $$, :'app_carla'),
  'P0002', null, 'no puedo aprobar mi propia solicitud');
select throws_ok(format($$ update public.applications set status = 'approved' where id = %L $$, :'app_carla'),
  '42501', null, 'no puedo cambiar estados directamente');

select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.applications where pet_id = :'pet1'), 2, 'quien publica ve todas las solicitudes');
select lives_ok(format($$ select public.review_application(%L, 'approved', 'Coordinemos una visita') $$, :'app_bruno'),
  'puedo aprobar una solicitud');
select is((select status::text from public.pets where id = :'pet1'), 'in_process', 'al aprobar, el perrito queda en proceso');
select throws_ok(format($$ select public.review_application(%L, 'approved') $$, :'app_carla'),
  '23505', null, 'no se pueden aprobar dos solicitudes a la vez');
select throws_ok(format($$ update public.pets set status = 'available' where id = %L $$, :'pet1'),
  '23514', null, 'no puedo reabrir la publicación con una solicitud aprobada');
select lives_ok(format($$ select public.complete_adoption(%L) $$, :'app_bruno'), 'puedo confirmar la adopción');
select is((select status::text from public.pets where id = :'pet1'), 'adopted', 'el perrito queda adoptado');
select is((select status::text from public.applications where id = :'app_carla'), 'cancelled',
  'las demás solicitudes se cierran automáticamente');
select is((select count(*)::int from public.followups where application_id = :'app_bruno'), 4,
  'se programan 4 seguimientos');

select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select ok(exists(select 1 from public.notifications where type = 'application_cancelled'),
  'se avisa a quienes no fueron elegidos');
select is((select count(*)::int from public.followups), 0, 'terceros no ven seguimientos');

select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);
select id as fu1 from public.followups where label = '1 semana' \gset
select id as fu6 from public.followups where label = '6 meses' \gset
select throws_ok(format($$ select public.submit_followup(%L, 5::smallint, 'Está feliz y juguetona', null) $$, :'fu6'),
  '23514', null, 'no se puede enviar un seguimiento muy anticipado');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner_id) values ('followup-photos', %L, %L) $$,
  :bruno || '/' || :'fu1' || '/x.jpg', :bruno), 'puedo subir la foto privada del seguimiento');
select lives_ok(format($$ select public.submit_followup(%L, 5::smallint, 'Está feliz y juguetona', %L) $$, :'fu1', :bruno || '/' || :'fu1' || '/x.jpg'),
  'puedo enviar el seguimiento');
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select is((select count(*)::int from storage.objects where bucket_id = 'followup-photos'), 1,
  'quien entregó al perrito ve la foto del seguimiento');
select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select is((select count(*)::int from storage.objects where bucket_id = 'followup-photos'), 0,
  'terceros no ven fotos de seguimiento');

-- -----------------------------------------------------------------------------
-- Reportes y moderación
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :bruno, 'role', 'authenticated')::text, true);
select lives_ok(format($$ insert into public.reports (target_type, pet_id, reason, details) values ('pet', %L, 'scam', 'Pide dinero') $$, :'lostpet'),
  'puedo reportar una publicación');
select throws_ok(format($$ insert into public.reports (target_type, pet_id, reason) values ('pet', %L, 'scam') $$, :'lostpet'),
  '23505', null, 'no puedo duplicar un reporte abierto');
select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
insert into public.reports (target_type, pet_id, reason) values ('pet', :'lostpet', 'animal_sale');
select set_config('request.jwt.claims', json_build_object('sub', :diego, 'role', 'authenticated')::text, true);
insert into public.reports (target_type, pet_id, reason) values ('pet', :'lostpet', 'false_info');
select is((select count(*)::int from public.reports), 1, 'solo veo mis reportes');

set local role anon;
select is((select count(*)::int from public.pets where id = :'lostpet'), 0, 'con 3 reportes la publicación se oculta');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :alice, 'role', 'authenticated')::text, true);
select is((select hidden from public.pets where id = :'lostpet'), true, 'la persona dueña ve que su publicación fue ocultada');
select throws_ok(format($$ select public.moderate_pet(%L, false) $$, :'lostpet'), '42501', null,
  'solo moderación puede restaurar publicaciones');

select set_config('request.jwt.claims', json_build_object('sub', :mod, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.reports), 3, 'moderación ve todos los reportes');
select lives_ok(format($$ select public.moderate_pet(%L, false) $$, :'lostpet'), 'moderación restaura la publicación');
select ok((select count(*) from public.audit_log) >= 2, 'las acciones quedan en auditoría');
select lives_ok(format($$ select public.set_account_status(%L, 'banned', 'Estafas reiteradas') $$, :diego),
  'moderación puede bloquear cuentas');
select throws_ok(format($$ select public.set_account_status(%L, 'banned', 'x') $$, :mod), '42501', null,
  'moderación no puede bloquearse a sí misma');

set local role anon;
select is((select count(*)::int from public.pets where id = :'lostpet'), 1, 'la publicación restaurada vuelve a ser pública');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :diego, 'role', 'authenticated')::text, true);
select throws_ok($$ select public.start_conversation((select id from public.pets where name = 'Pelusa QA')) $$,
  '42501', null, 'una cuenta bloqueada no puede contactar');

-- Verificación
select set_config('request.jwt.claims', json_build_object('sub', :carla, 'role', 'authenticated')::text, true);
select lives_ok($$ insert into public.verification_requests (requested_type, organization_name, description)
  values ('shelter', 'Fundación Patitas', 'Somos una fundación que rescata perritos en Santiago desde 2015.') $$,
  'puedo solicitar verificación');
select is((select verification_status::text from public.profiles where id = :carla), 'pending', 'mi perfil queda en revisión');
select id as vreq from public.verification_requests \gset
select set_config('request.jwt.claims', json_build_object('sub', :mod, 'role', 'authenticated')::text, true);
select lives_ok(format($$ select public.review_verification(%L, true, 'Documentos en orden') $$, :'vreq'),
  'moderación aprueba la verificación');
select is((select verification_status::text || '/' || account_type::text from public.profiles where id = :carla),
  'verified/shelter', 'el perfil queda verificado como fundación');

-- Estadísticas públicas
set local role anon;
select ok((public.get_public_stats() ->> 'adopted')::int >= 1, 'las estadísticas públicas cuentan adopciones');
select throws_ok($$ select public.admin_overview() $$, '42501', null, 'visitantes no ven el panel de moderación');

select * from finish();
rollback;
