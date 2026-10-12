-- =============================================================================
-- Datos de ejemplo SOLO para desarrollo local (npx supabase db reset).
-- Nunca ejecutes este archivo en producción.
--
-- Cuentas de prueba (contraseña para todas: Huellitas2026):
--   admin@huellitas.test        Administración
--   fundacion@huellitas.test    Fundación verificada
--   rescatista@huellitas.test   Rescatista independiente
--   adoptante@huellitas.test    Persona que quiere adoptar
-- =============================================================================

do $$
declare
  v_users jsonb := '[
    {"id": "a0000000-0000-4000-8000-000000000001", "email": "admin@huellitas.test", "name": "Equipo Huellitas"},
    {"id": "a0000000-0000-4000-8000-000000000002", "email": "fundacion@huellitas.test", "name": "Fundación Patitas Felices"},
    {"id": "a0000000-0000-4000-8000-000000000003", "email": "rescatista@huellitas.test", "name": "Camila Rescata"},
    {"id": "a0000000-0000-4000-8000-000000000004", "email": "adoptante@huellitas.test", "name": "Diego Adopta"}
  ]';
  v_user jsonb;
begin
  for v_user in select * from jsonb_array_elements(v_users)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', (v_user ->> 'id')::uuid, 'authenticated', 'authenticated',
      v_user ->> 'email', extensions.crypt('Huellitas2026', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('display_name', v_user ->> 'name'),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), (v_user ->> 'id')::uuid, v_user ->> 'id', 'email',
      jsonb_build_object('sub', v_user ->> 'id', 'email', v_user ->> 'email', 'email_verified', true),
      now(), now(), now()
    );
  end loop;
end;
$$;

update public.profiles set commune_code = '13120', terms_accepted_at = now(), adult_confirmed_at = now(), role = 'admin'
where id = 'a0000000-0000-4000-8000-000000000001';

update public.profiles set
  commune_code = '13101', terms_accepted_at = now(), adult_confirmed_at = now(),
  account_type = 'shelter', verification_status = 'verified', verified_at = now(),
  bio = 'Rescatamos, rehabilitamos y buscamos hogar para perritos en situación de calle desde 2015.',
  instagram = 'patitasfelices.cl'
where id = 'a0000000-0000-4000-8000-000000000002';

update public.profiles set
  commune_code = '05101', terms_accepted_at = now(), adult_confirmed_at = now(), account_type = 'rescuer',
  bio = 'Rescatista independiente en Valparaíso. Todos mis perritos se entregan vacunados y esterilizados.'
where id = 'a0000000-0000-4000-8000-000000000003';

update public.profiles set commune_code = '13114', terms_accepted_at = now(), adult_confirmed_at = now()
where id = 'a0000000-0000-4000-8000-000000000004';

update public.profile_private set phone = '+56 9 8765 4321' where user_id = 'a0000000-0000-4000-8000-000000000002';

insert into public.pets (
  owner_id, kind, name, sex, size, birth_date_estimate, breed, color, weight_kg, description, energy,
  good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized, microchipped,
  special_needs, health_notes, requirements, commune_code, location_hint, event_date, is_urgent
) values
  ('a0000000-0000-4000-8000-000000000002', 'adoption', 'Canela', 'female', 'medium', current_date - 730, 'Mestiza',
   'Café claro', 14.5,
   'Canela fue rescatada de una autopista. Es dulce, tranquila y le encanta dormir al sol. Camina bien con correa y se lleva excelente con niños.',
   'medium', true, true, null, true, true, true, true, false, null,
   'Compromiso de paseos diarios y visita de seguimiento.', '13101', null, null, false),
  ('a0000000-0000-4000-8000-000000000002', 'adoption', 'Tango', 'male', 'large', current_date - 1825, 'Mestizo tipo pastor',
   'Negro con fuego', 28.0,
   'Tango es un perro noble y protector. Estuvo años en la calle y ahora busca un hogar con patio donde pueda descansar y recibir cariño.',
   'low', true, false, false, true, true, true, true, false, 'Displasia leve de cadera, controlada.',
   'Casa con patio cerrado.', '13101', null, null, true),
  ('a0000000-0000-4000-8000-000000000003', 'adoption', 'Luna', 'female', 'small', current_date - 120, 'Mestiza',
   'Blanca con manchas', 3.2,
   'Luna es una cachorrita juguetona encontrada en una caja junto a sus hermanos. Ya come sola, usa pañal y busca familia con tiempo para educarla.',
   'high', true, true, true, true, true, false, false, false, 'Esterilización comprometida a los 6 meses.',
   'Compromiso de esterilización.', '05101', null, null, false),
  ('a0000000-0000-4000-8000-000000000003', 'adoption', 'Pirata', 'male', 'medium', current_date - 2920, 'Quiltro',
   'Atigrado', 16.0,
   'Pirata perdió un ojo por un atropello, pero no la alegría. Es senior, muy cariñoso y solo pide un sillón y paseos cortos.',
   'low', true, true, true, true, true, true, false, true, 'Tuerto. Requiere control veterinario anual.',
   null, '05109', null, null, true),
  ('a0000000-0000-4000-8000-000000000002', 'adoption', 'Maní', 'male', 'small', current_date - 400, 'Mestizo',
   'Caramelo', 7.0,
   'Maní es sociable, inteligente y aprende rápido. Ideal para departamento: es tranquilo dentro de casa y súper juguetón en la plaza.',
   'medium', true, true, null, true, true, true, true, false, null, null, '13120', null, null, false),
  ('a0000000-0000-4000-8000-000000000004', 'lost', 'Bruno', 'male', 'medium', current_date - 1460, 'Mestizo',
   'Café con pecho blanco', 15.0,
   'Se perdió durante los fuegos artificiales. Lleva collar azul sin placa. Es asustadizo: si lo ves, no lo persigas y avísame.',
   'medium', null, null, null, true, true, true, false, false, null, null, '13114', 'Cerca de Parque Araucano',
   current_date - 3, false),
  ('a0000000-0000-4000-8000-000000000003', 'found', 'Sin nombre', 'female', 'medium', null, 'Mestiza',
   'Negra', null,
   'Encontrada deambulando, muy mansa y con signos de haber tenido hogar. Está en hogar temporal. Pide fotos antiguas como prueba si crees que es tuya.',
   null, null, null, null, false, false, false, false, false, null, null, '05101', 'Sector Plaza Victoria',
   current_date - 1, true);

-- Otras especies
insert into public.pets (
  owner_id, kind, species, name, sex, size, birth_date_estimate, breed, color, description, energy,
  good_with_kids, good_with_dogs, good_with_cats, vaccinated, dewormed, sterilized, microchipped, commune_code, is_urgent
) values
  ('a0000000-0000-4000-8000-000000000002', 'adoption', 'cat', 'Mostaza', 'female', 'small', current_date - 540, 'Mestiza',
   'Naranja atigrada',
   'Mostaza llegó a la fundación con su camada. Es curiosa, tranquila, usa su arenero y ama dormir en las ventanas al sol.',
   'low', true, null, true, true, true, true, true, '13120', false),
  ('a0000000-0000-4000-8000-000000000003', 'adoption', 'rabbit', 'Copito', 'male', 'small', current_date - 300, 'Mestizo',
   'Blanco',
   'Copito fue abandonado en un parque. Es dócil, come heno y verduras frescas y necesita un espacio seguro para saltar todos los días.',
   'medium', true, null, null, false, true, true, false, '05109', false);
