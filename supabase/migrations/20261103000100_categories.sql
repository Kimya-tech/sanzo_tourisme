-- Tourisme Sanzo — catégorie principale de chaque site (couleur du repère sur la carte, légende).
-- Liste fermée, reprise du cahier des charges ; les libellés FR / EN sont dans l'application.
-- Colonne facultative pour les sites existants ; le formulaire de collecte la rend obligatoire.

alter table public.sites
  add column category text check (category in ('nature', 'history', 'culture', 'village', 'food', 'event'));

grant select (category) on public.sites to anon;
grant insert (category), update (category) on public.sites to authenticated;

-- Nouvelle colonne ajoutée en fin de vue (exigence de « create or replace view »).
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
  ) as photos,
  s.category
from public.sites s
where s.is_published
order by s.sort_order nulls last, s.collected_on, s.created_at;
