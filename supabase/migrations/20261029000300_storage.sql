-- Tourisme Sanzo — stockage des photos.
-- Bucket public (les sites sont publiés immédiatement) ; photos compressées par l'application
-- avant envoi. Chemin imposé : <user_id>/<site_id>/<fichier>. Aucune politique UPDATE : un
-- fichier existant ne peut pas être écrasé.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Vrai si le site désigné par le chemin appartient à l'utilisateur courant.
create or replace function private.owns_site_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(p_name))[2]
      and s.created_by = auth.uid()
  );
$$;
revoke all on function private.owns_site_folder(text) from public, anon;
grant execute on function private.owns_site_folder(text) to authenticated;

create policy site_photos_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_collector())
    and private.owns_site_folder(name)
  );

-- Nécessaire au client Storage pour lister ou supprimer ses propres fichiers.
create policy site_photos_select_own_files on storage.objects
  for select to authenticated
  using (bucket_id = 'site-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy site_photos_delete_own_files on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_collector())
  );
