-- =============================================================================
-- Huellitas · Almacenamiento de archivos, tiempo real, tareas programadas
-- y permisos finales de funciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
--   avatars            público   2 MB   fotos de perfil
--   dog-photos         público   5 MB   fotos de publicaciones
--   followup-photos    privado   5 MB   fotos de seguimiento (solo adoptante y publicador)
--   verification-docs  privado  10 MB   respaldos de verificación (solo dueño y moderación)
-- Las imágenes se reducen y se les quitan metadatos (EXIF/GPS) en el navegador
-- antes de subirlas.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('dog-photos', 'dog-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('followup-photos', 'followup-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Avatares: cada persona administra su carpeta {uid}/
create policy "Avatar: ver mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Avatar: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Avatar: reemplazar en mi carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Avatar: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Fotos de perritos: {uid}/{dog_id}/archivo, solo en publicaciones propias.
-- Ojo: dentro de los EXISTS se usa objects.name, porque "name" también es una columna de dogs.
create policy "Fotos perrito: ver mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Fotos perrito: subir a mis publicaciones" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.dogs d
      where d.id::text = (storage.foldername(objects.name))[2] and d.owner_id = (select auth.uid())
    )
  );
create policy "Fotos perrito: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Fotos de seguimiento: {adoptante}/{followup_id}/archivo
create policy "Seguimiento: ver si participo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'followup-photos'
    and exists (
      select 1 from public.followups f
      where f.id::text = (storage.foldername(objects.name))[2]
        and (select auth.uid()) in (f.adopter_id, f.publisher_id)
    )
  );
create policy "Seguimiento: subir el mío" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'followup-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.followups f
      where f.id::text = (storage.foldername(objects.name))[2]
        and f.adopter_id = (select auth.uid())
        and f.submitted_at is null
    )
  );
create policy "Seguimiento: borrar el mío" on storage.objects
  for delete to authenticated
  using (bucket_id = 'followup-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Documentos de verificación: {uid}/archivo
create policy "Verificación: ver mis documentos o moderación" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or (select public.is_moderator()))
  );
create policy "Verificación: subir mis documentos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Verificación: borrar mis documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- -----------------------------------------------------------------------------
-- Tiempo real (chat, notificaciones y bandeja de conversaciones)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.conversations;

-- -----------------------------------------------------------------------------
-- Tarea diaria de seguimientos (si pg_cron está disponible)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('huellitas-seguimientos', '0 13 * * *', 'select public.notify_due_followups()');
  end if;
exception when others then
  raise notice 'pg_cron no disponible (%). Programa public.notify_due_followups() manualmente.', sqlerrm;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución de funciones
-- Por defecto nadie puede ejecutar funciones; se habilitan solo las necesarias.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Utilidades puras usadas por triggers que corren con los permisos de quien edita.
grant execute on function
  public.clean_text(text),
  public.normalize_text(text),
  public.detect_risky_text(text)
to anon, authenticated;

-- Usadas por políticas RLS o públicas.
grant execute on function
  public.is_active_user(uuid),
  public.get_public_stats(),
  public.get_profile_stats(uuid)
to anon, authenticated;

grant execute on function
  public.is_moderator(),
  public.is_admin(),
  public.is_conversation_participant(uuid),
  public.my_unread_counts(),
  public.start_conversation(uuid),
  public.mark_conversation_read(uuid),
  public.share_contact(uuid),
  public.get_conversation_contact(uuid),
  public.review_application(uuid, public.application_status, text),
  public.withdraw_application(uuid),
  public.complete_adoption(uuid),
  public.submit_followup(uuid, smallint, text, text),
  public.comment_followup(uuid, text),
  public.moderate_dog(uuid, boolean, text),
  public.resolve_report(uuid, public.report_status, text),
  public.set_account_status(uuid, public.account_status, text, integer),
  public.set_user_role(uuid, public.user_role),
  public.review_verification(uuid, boolean, text),
  public.admin_overview()
to authenticated;
