-- Tourisme Sanzo — miniatures des photos.
-- L'application de collecte enregistre, en plus de chaque photo (1600 px), une miniature (480 px)
-- utilisée par la liste des sites de la plateforme : chargement léger sur les réseaux mobiles.

alter table public.site_photos
  add column thumb_path text unique check (
    thumb_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'
  ),
  add constraint site_photos_thumb_matches_site check (
    thumb_path is null or split_part(thumb_path, '/', 2) = site_id::text
  );

grant insert (thumb_path) on public.site_photos to authenticated;
grant select (thumb_path) on public.site_photos to anon;

-- La miniature doit, comme la photo, se trouver dans le dossier du collecteur.
alter policy site_photos_insert_own_site on public.site_photos
  with check (
    (select private.is_active_collector())
    and created_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and (thumb_path is null or split_part(thumb_path, '/', 1) = (select auth.uid())::text)
    and exists (select 1 from public.sites s where s.id = site_id and s.created_by = (select auth.uid()))
  );

create or replace view public.story_sites
with (security_invoker = true) as
select
  s.id,
  s.name,
  s.description,
  s.collected_on,
  s.collector_name,
  s.language,
  s.latitude,
  s.longitude,
  s.updated_at,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'path', p.storage_path, 'thumb', p.thumb_path,
          'caption', p.caption, 'width', p.width, 'height', p.height
        )
        order by p.sort_order, p.created_at
      )
      from public.site_photos p
      where p.site_id = s.id
    ),
    '[]'::jsonb
  ) as photos
from public.sites s
where s.is_published
order by s.sort_order nulls last, s.collected_on, s.created_at;
