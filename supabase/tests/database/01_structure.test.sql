-- Structure et durcissement : RLS, privilèges, vue publique, bucket.
begin;
\ir _helpers.psql

select plan(10);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS est activée sur toutes les tables du schéma public'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
  0,
  'anon ne dispose d''aucun privilège d''écriture'
);

select is(
  (select count(*)::int from information_schema.column_privileges
   where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE')),
  0,
  'anon ne dispose d''aucun privilège d''écriture par colonne'
);

select ok(
  not has_table_privilege('anon', 'private.collect_invites', 'SELECT')
  and not has_table_privilege('authenticated', 'private.collect_invites', 'SELECT')
  and not has_table_privilege('authenticated', 'private.collect_code_failures', 'SELECT'),
  'Les liens de collecte (codes hachés) et les tentatives ne sont pas lisibles par l''API'
);

select ok(
  not has_function_privilege('anon', 'private.create_collect_invite(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.create_collect_invite(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.set_collect_invite_active(text, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.register_collector(text, text)', 'EXECUTE'),
  'Seule l''équipe (SQL Editor) gère les liens ; anon ne peut pas s''enregistrer sans session'
);

select ok(
  not has_column_privilege('authenticated', 'public.sites', 'is_published', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.sites', 'created_by', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.sites', 'sort_order', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.collectors', 'is_active', 'UPDATE'),
  'Publication, auteur, ordre et activation ne sont pas modifiables par les collecteurs'
);

select ok(
  not has_column_privilege('anon', 'public.sites', 'created_by', 'SELECT')
  and not has_column_privilege('anon', 'public.sites', 'location_accuracy_m', 'SELECT')
  and not has_table_privilege('anon', 'public.collectors', 'SELECT'),
  'anon ne lit ni les identifiants des collecteurs ni la table des collecteurs'
);

select is(
  (select count(*)::int from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce(c.reloptions @> array['security_invoker=true'], false)),
  0,
  'Les vues publiques sont en security_invoker'
);

select is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef
     and not coalesce(p.proconfig @> array['search_path=""'], false)),
  0,
  'Toutes les fonctions SECURITY DEFINER fixent un search_path vide'
);

select results_eq(
  $$ select public, allowed_mime_types from storage.buckets where id = 'site-photos' $$,
  $$ values (true, array['image/jpeg', 'image/png', 'image/webp']) $$,
  'Bucket public limité aux images JPEG, PNG et WebP'
);

select * from finish();
rollback;
