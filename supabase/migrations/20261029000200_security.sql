-- Tourisme Sanzo — sécurité : collecteurs, privilèges par colonne et RLS.
--
-- Lecture : tout le monde (rôle anon) voit les sites publiés et leurs photos.
-- Écriture : uniquement un collecteur actif, c'est-à-dire une session (anonyme Supabase) ayant
-- présenté le code d'accès du lien de collecte via public.register_collector().
-- Un collecteur ne modifie ou ne supprime que ses propres sites et photos.

-- Collecteur actif : sa session ET son lien de collecte sont actifs.
create or replace function private.is_active_collector()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collectors c
    join private.collect_invites i on i.id = c.invite_id
    where c.user_id = auth.uid() and c.is_active and i.is_active
  );
$$;
revoke all on function private.is_active_collector() from public;
grant execute on function private.is_active_collector() to anon, authenticated, service_role;

-- Enregistre la session courante comme collecteur, après vérification du code de son lien personnel.
-- Retourne false si le code est inconnu ou désactivé (l'échec est conservé pour limiter les essais).
-- Codes d'erreur : not_authenticated, invalid_name, too_many_attempts, collector_disabled.
create or replace function public.register_collector(p_code text, p_display_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite uuid;
  v_name text := trim(coalesce(p_display_name, ''));
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if (
    select count(*) from private.collect_code_failures f
    where f.user_id = v_user and f.created_at > now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select i.id into v_invite
  from private.collect_invites i
  where i.token_hash = private.hash_collect_token(p_code) and i.is_active;
  if v_invite is null then
    insert into private.collect_code_failures (user_id) values (v_user);
    return false;
  end if;

  insert into public.collectors (user_id, invite_id, display_name)
  values (v_user, v_invite, v_name)
  on conflict (user_id) do update set display_name = excluded.display_name, invite_id = excluded.invite_id
  where public.collectors.is_active;

  if not private.is_active_collector() then
    raise exception 'collector_disabled' using errcode = '42501';
  end if;
  return true;
end;
$$;
revoke all on function public.register_collector(text, text) from public, anon;
grant execute on function public.register_collector(text, text) to authenticated;

-- État du collecteur courant pour l'application : nom et accès réellement actif (session + lien).
create or replace function public.my_collector()
returns table (display_name text, is_active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.display_name, private.is_active_collector()
  from public.collectors c
  where c.user_id = auth.uid();
$$;
revoke all on function public.my_collector() from public, anon;
grant execute on function public.my_collector() to authenticated;

-- ---------------------------------------------------------------------------
-- Privilèges : retrait des droits par défaut de Supabase, puis octroi explicite.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.collectors to authenticated;
grant update (display_name) on public.collectors to authenticated;

grant select (
  id, name, description, collected_on, collector_name, language,
  latitude, longitude, location, sort_order, is_published, created_at, updated_at
) on public.sites to anon;
grant select, delete on public.sites to authenticated;
grant insert (
  name, description, collected_on, collector_name, language, latitude, longitude, location_accuracy_m
) on public.sites to authenticated;
grant update (
  name, description, collected_on, collector_name, language, latitude, longitude, location_accuracy_m
) on public.sites to authenticated;

grant select (id, site_id, storage_path, caption, width, height, sort_order, created_at)
  on public.site_photos to anon;
grant select, delete on public.site_photos to authenticated;
grant insert (site_id, storage_path, caption, width, height, sort_order) on public.site_photos to authenticated;
grant update (caption, sort_order) on public.site_photos to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.collectors enable row level security;
alter table public.sites enable row level security;
alter table public.site_photos enable row level security;

create policy collectors_select_own on public.collectors
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy collectors_update_own on public.collectors
  for update to authenticated
  using (user_id = (select auth.uid()) and is_active)
  with check (user_id = (select auth.uid()));

create policy sites_select_published on public.sites
  for select to anon, authenticated
  using (is_published);

create policy sites_select_own on public.sites
  for select to authenticated
  using (created_by = (select auth.uid()));

create policy sites_insert_collector on public.sites
  for insert to authenticated
  with check ((select private.is_active_collector()) and created_by = (select auth.uid()));

create policy sites_update_own on public.sites
  for update to authenticated
  using ((select private.is_active_collector()) and created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy sites_delete_own on public.sites
  for delete to authenticated
  using ((select private.is_active_collector()) and created_by = (select auth.uid()));

create policy site_photos_select_published on public.site_photos
  for select to anon, authenticated
  using (exists (select 1 from public.sites s where s.id = site_id and s.is_published));

create policy site_photos_select_own on public.site_photos
  for select to authenticated
  using (created_by = (select auth.uid()));

create policy site_photos_insert_own_site on public.site_photos
  for insert to authenticated
  with check (
    (select private.is_active_collector())
    and created_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.sites s where s.id = site_id and s.created_by = (select auth.uid()))
  );

create policy site_photos_update_own on public.site_photos
  for update to authenticated
  using ((select private.is_active_collector()) and created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy site_photos_delete_own on public.site_photos
  for delete to authenticated
  using ((select private.is_active_collector()) and created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Vue de la story map : sites publiés et leurs photos, en une seule requête.
-- security_invoker : la RLS ci-dessus s'applique ; le filtre « publié » est répété pour
-- qu'un collecteur connecté ne voie pas ses sites masqués dans la story map.
-- ---------------------------------------------------------------------------
create view public.story_sites
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
          'id', p.id, 'path', p.storage_path, 'caption', p.caption, 'width', p.width, 'height', p.height
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

revoke all on public.story_sites from anon, authenticated;
grant select on public.story_sites to anon, authenticated;
