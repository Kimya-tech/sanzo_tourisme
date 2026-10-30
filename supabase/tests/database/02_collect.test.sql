-- Collecte : code d'accès, création et protection des sites, visibilité publique.
begin;
\ir _helpers.psql

select plan(29);

select tests.create_anonymous_user() as visitor_id \gset
select tests.create_anonymous_user() as alice_id \gset
select tests.create_collector('Bob') as bob_id \gset

-- Visiteur anonyme (sans session) ------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Intrus', 'Tentative d''écriture anonyme.', 'X', 5.28, 9.98) $$,
  '42501', null,
  'Un visiteur ne peut pas créer de site'
);
reset role;

-- Session anonyme sans code -------------------------------------------------------
select tests.authenticate_as(:'visitor_id');
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Intrus', 'Session sans code d''accès.', 'X', 5.28, 9.98) $$,
  '42501', null,
  'Une session sans code d''accès ne peut pas créer de site'
);

select is(public.register_collector('mauvais-code', 'Visiteur'), false, 'Un code erroné est refusé');
select public.register_collector('mauvais-code', 'Visiteur') from generate_series(1, 4);
select throws_ok(
  $$ select public.register_collector('CODE-DE-TEST-123', 'Visiteur') $$,
  'P0001', 'too_many_attempts',
  'Après 5 codes erronés, les essais sont bloqués (même avec le bon code)'
);
reset role;

-- Enregistrement d'un collecteur -------------------------------------------------
select tests.authenticate_as(:'alice_id');
select throws_ok(
  $$ select public.register_collector('CODE-DE-TEST-123', ' ') $$,
  'P0001', 'invalid_name',
  'Le nom du collecteur est obligatoire'
);
select is(public.register_collector('  CODE-DE-TEST-123 ', 'Alice'), true, 'Le bon code enregistre le collecteur');
select is(
  (select display_name from public.collectors where user_id = auth.uid()),
  'Alice',
  'Le collecteur voit son nom enregistré'
);

-- Création d'un site ----------------------------------------------------------------
select lives_ok(
  $$ insert into public.sites (name, description, collected_on, collector_name, latitude, longitude, location_accuracy_m)
     values ('Site fictif', 'Description fictive du site de test.', current_date, 'Alice', 5.28, 9.98, 8) $$,
  'Un collecteur crée un site'
);
select id as site_id from public.sites where name = 'Site fictif' \gset
select is(
  (select created_by from public.sites where id = :'site_id'),
  :'alice_id'::uuid,
  'Le site est rattaché à son collecteur'
);

select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Court', 'Trop', 'Alice', 5.28, 9.98) $$,
  '23514', null,
  'Une description trop courte est refusée'
);
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Paris', 'Coordonnées hors du Cameroun.', 'Alice', 48.85, 2.35) $$,
  '23514', null,
  'Des coordonnées hors du Cameroun sont refusées'
);
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude, collected_on)
     values ('Futur', 'Date de collecte dans le futur.', 'Alice', 5.28, 9.98, current_date + 30) $$,
  '23514', null,
  'Une date de collecte future est refusée'
);
select throws_ok(
  format($$ update public.sites set is_published = false where id = %L $$, :'site_id'),
  '42501', null,
  'Un collecteur ne peut pas changer la publication'
);
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude, created_by)
     values ('Usurpation', 'Site attribué à un autre collecteur.', 'Alice', 5.28, 9.98, gen_random_uuid()) $$,
  '42501', null,
  'Un collecteur ne peut pas attribuer un site à quelqu''un d''autre'
);
reset role;

-- Publication immédiate ------------------------------------------------------------
select tests.authenticate_as_anon();
select results_eq(
  format($$ select name, collector_name, round(latitude::numeric, 2) from public.story_sites where id = %L $$, :'site_id'),
  $$ values ('Site fictif'::text, 'Alice'::text, 5.28::numeric) $$,
  'Le site apparaît immédiatement dans la story map'
);
reset role;

-- Isolation entre collecteurs ---------------------------------------------------------
select tests.authenticate_as(:'bob_id');
update public.sites set name = 'Piraté' where id = :'site_id';
delete from public.sites where id = :'site_id';
reset role;
select is(
  (select name from public.sites where id = :'site_id'),
  'Site fictif',
  'Un autre collecteur ne peut ni modifier ni supprimer le site'
);

select tests.authenticate_as(:'alice_id');
select lives_ok(
  format($$ update public.sites set description = 'Description corrigée du site fictif.' where id = %L $$, :'site_id'),
  'Le collecteur corrige son propre site'
);
reset role;

-- Masquage par l'équipe ---------------------------------------------------------------
update public.sites set is_published = false where id = :'site_id';
select tests.authenticate_as_anon();
select is(
  (select count(*)::int from public.sites where id = :'site_id'),
  0,
  'Un site masqué par l''équipe est invisible, même par son identifiant'
);
reset role;
select tests.authenticate_as(:'alice_id');
select is(
  (select count(*)::int from public.story_sites where id = :'site_id'),
  0,
  'Un site masqué n''apparaît pas dans la story map, même pour son collecteur'
);
select is(
  (select count(*)::int from public.sites where id = :'site_id'),
  1,
  'Le collecteur retrouve son site masqué dans sa liste'
);
reset role;
update public.sites set is_published = true where id = :'site_id';

-- Désactivation d'un collecteur ---------------------------------------------------------
update public.collectors set is_active = false where user_id = :'alice_id';
select tests.authenticate_as(:'alice_id');
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Après désactivation', 'Le collecteur a été désactivé.', 'Alice', 5.28, 9.98) $$,
  '42501', null,
  'Un collecteur désactivé ne peut plus créer de site'
);
select throws_ok(
  $$ select public.register_collector('CODE-DE-TEST-123', 'Alice') $$,
  '42501', 'collector_disabled',
  'Un collecteur désactivé ne peut pas se réactiver avec le code'
);
update public.sites set name = 'Après désactivation' where id = :'site_id';
reset role;
select is(
  (select name from public.sites where id = :'site_id'),
  'Site fictif',
  'Un collecteur désactivé ne peut plus modifier ses sites'
);

select tests.authenticate_as_anon();
select is(
  (select count(*)::int from public.story_sites where id = :'site_id'),
  1,
  'Les sites d''un collecteur désactivé restent publiés'
);
reset role;

-- Retrait de l'accès d'un membre (lien personnel révoqué) ----------------------------------
select private.create_collect_invite('Membre B', 'CODE-MEMBRE-B-456');
select tests.create_anonymous_user() as carol_id \gset
select tests.create_anonymous_user() as carol_new_session_id \gset

select tests.authenticate_as(:'carol_id');
select is(public.register_collector('CODE-MEMBRE-B-456', 'Carol'), true, 'Chaque membre dispose de son propre lien');
reset role;

select private.set_collect_invite_active('Membre B', false);

select tests.authenticate_as(:'carol_id');
select throws_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Après révocation', 'Le lien du membre a été révoqué.', 'Carol', 5.28, 9.98) $$,
  '42501', null,
  'Après révocation du lien, le membre ne peut plus créer de site'
);
select is(
  (select is_active from public.my_collector()),
  false,
  'L''application est informée que l''accès est désactivé'
);
reset role;

select tests.authenticate_as(:'carol_new_session_id');
select is(
  public.register_collector('CODE-MEMBRE-B-456', 'Carol'),
  false,
  'Un lien révoqué ne permet pas de se réenregistrer depuis une nouvelle session'
);
reset role;

select tests.authenticate_as(:'bob_id');
select lives_ok(
  $$ insert into public.sites (name, description, collector_name, latitude, longitude)
     values ('Site de Bob', 'Les autres membres ne sont pas affectés.', 'Bob', 5.28, 9.98) $$,
  'La révocation d''un lien n''affecte pas les autres membres'
);
reset role;

select * from finish();
rollback;
