-- Tourisme Sanzo — schéma de la story map et de la collecte.
--
--   collectors   : sessions des membres autorisés à collecter (session anonyme Supabase, sans e-mail
--                  ni mot de passe), validées par le code du lien de collecte personnel du membre.
--   sites        : sites touristiques collectés, publiés immédiatement sur la carte.
--   site_photos  : photos des sites (bucket public « site-photos »).

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- clock_timestamp() (et non now()) : horodatage réel, même dans une longue transaction.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Liens de collecte personnels (un par membre), codes stockés hachés, jamais exposés par l'API.
-- Retirer l'accès d'un membre = désactiver son lien : toutes ses sessions perdent le droit d'écrire.
-- ---------------------------------------------------------------------------
create table private.collect_invites (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (char_length(trim(label)) between 2 and 80),
  -- SHA-256 du code : suffisant pour un code aléatoire long, et permet une recherche indexée.
  token_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function private.hash_collect_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(trim(coalesce(p_token, '')), 'sha256'), 'hex');
$$;

-- À exécuter dans le SQL Editor de Supabase : crée le lien d'un membre et retourne son code
-- (à placer dans le lien …/fr/collecte#code=<code>). Le code n'est affiché qu'une fois.
create or replace function private.create_collect_invite(p_label text, p_token text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := coalesce(p_token, encode(extensions.gen_random_bytes(12), 'hex'));
begin
  if char_length(trim(v_token)) < 12 then
    raise exception 'Le code de collecte doit contenir au moins 12 caractères.';
  end if;
  insert into private.collect_invites (label, token_hash)
  values (trim(p_label), private.hash_collect_token(v_token));
  return trim(v_token);
end;
$$;

-- Active ou désactive le lien d'un membre (par son libellé).
create or replace function private.set_collect_invite_active(p_label text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.collect_invites set is_active = p_active where label = trim(p_label);
  if not found then
    raise exception 'Aucun lien de collecte nommé « % ».', p_label;
  end if;
end;
$$;

revoke all on function private.create_collect_invite(text, text) from public, anon, authenticated;
revoke all on function private.set_collect_invite_active(text, boolean) from public, anon, authenticated;
revoke all on function private.hash_collect_token(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Collecteurs (une ligne par session / appareil, rattachée au lien utilisé)
-- ---------------------------------------------------------------------------
create table public.collectors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invite_id uuid not null references private.collect_invites (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collectors_invite_idx on public.collectors (invite_id);

create trigger collectors_updated_at before update on public.collectors
  for each row execute function private.set_updated_at();

-- Tentatives de code erronées (limitation des essais par session).
create table private.collect_code_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index collect_code_failures_user_idx on private.collect_code_failures (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Sites touristiques
-- ---------------------------------------------------------------------------
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 150),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  collected_on date not null default current_date
    check (collected_on between date '2000-01-01' and current_date + 1),
  collector_name text not null check (char_length(trim(collector_name)) between 2 and 80),
  -- Langue dans laquelle le texte a été rédigé (aucune traduction automatique).
  language text not null default 'fr' check (language in ('fr', 'en')),
  latitude double precision not null,
  longitude double precision not null,
  location extensions.geography(point, 4326)
    generated always as (
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    ) stored,
  location_accuracy_m numeric(8, 2) check (location_accuracy_m >= 0),
  -- Ordre d'affichage dans le récit (facultatif, réglé par l'équipe) ; sinon ordre de collecte.
  sort_order integer,
  -- L'équipe peut masquer un site (tableau de bord Supabase) sans le supprimer.
  is_published boolean not null default true,
  created_by uuid default auth.uid() references public.collectors (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Point plausible pour le Cameroun (détecte notamment l'inversion latitude/longitude).
  constraint sites_location_cameroon check (latitude between 1.5 and 13.5 and longitude between 8.0 and 16.5)
);
create index sites_location_gix on public.sites using gist (location);
create index sites_created_by_idx on public.sites (created_by);
create index sites_published_order_idx on public.sites (is_published, sort_order, collected_on, created_at);

create trigger sites_updated_at before update on public.sites
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------
create table public.site_photos (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  -- Chemin dans le bucket « site-photos » : <user_id>/<site_id>/<fichier>
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'
  ),
  caption text check (char_length(caption) <= 300),
  width integer check (width > 0),
  height integer check (height > 0),
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references public.collectors (user_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint site_photos_path_matches_site check (split_part(storage_path, '/', 2) = site_id::text)
);
create index site_photos_site_idx on public.site_photos (site_id, sort_order);
