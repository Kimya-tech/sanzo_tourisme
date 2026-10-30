-- Photos : enregistrement, stockage et affichage public.
begin;
\ir _helpers.psql

select plan(14);

select tests.create_collector('Alice') as alice_id \gset
select tests.create_collector('Bob') as bob_id \gset
select tests.create_anonymous_user() as visitor_id \gset

select tests.authenticate_as(:'alice_id');
insert into public.sites (name, description, collector_name, latitude, longitude)
values ('Site photos', 'Site fictif pour tester les photos.', 'Alice', 5.28, 9.98);
select id as site_id from public.sites where name = 'Site photos' \gset
reset role;

select tests.authenticate_as(:'bob_id');
insert into public.sites (name, description, collector_name, latitude, longitude)
values ('Site de Bob', 'Autre site fictif pour tester les photos.', 'Bob', 5.29, 9.99);
select id as bob_site_id from public.sites where name = 'Site de Bob' \gset
reset role;

select format('%s/%s/photo-1.jpg', :'alice_id', :'site_id') as alice_path \gset
select format('%s/%s/intrus.jpg', :'alice_id', :'bob_site_id') as alice_on_bob_path \gset
select format('%s/%s/intrus.jpg', :'bob_id', :'site_id') as bob_folder_path \gset

-- Stockage -------------------------------------------------------------------------------
select tests.authenticate_as(:'alice_id');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('site-photos', %L) $$, :'alice_path'),
  'Un collecteur dépose une photo pour son site'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('site-photos', %L) $$, :'bob_folder_path'),
  '42501', null,
  'Un collecteur ne peut pas déposer dans le dossier d''un autre'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('site-photos', %L) $$, :'alice_on_bob_path'),
  '42501', null,
  'Un collecteur ne peut pas déposer de photo pour le site d''un autre'
);
reset role;

select tests.authenticate_as(:'visitor_id');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('site-photos', %L) $$,
         format('%s/%s/x.jpg', :'visitor_id', :'site_id')),
  '42501', null,
  'Une session sans code d''accès ne peut pas déposer de photo'
);
reset role;

-- Enregistrement des photos ---------------------------------------------------------------
select tests.authenticate_as(:'alice_id');
select lives_ok(
  format($$ insert into public.site_photos (site_id, storage_path, caption, width, height)
            values (%L, %L, 'Vue fictive', 1280, 960) $$, :'site_id', :'alice_path'),
  'Le collecteur associe la photo à son site'
);
select throws_ok(
  format($$ insert into public.site_photos (site_id, storage_path) values (%L, %L) $$, :'bob_site_id', :'alice_on_bob_path'),
  '42501', null,
  'Un collecteur ne peut pas ajouter de photo au site d''un autre'
);
select throws_ok(
  format($$ insert into public.site_photos (site_id, storage_path) values (%L, %L) $$,
         :'site_id', format('%s/%s/autre.jpg', :'alice_id', :'bob_site_id')),
  '23514', null,
  'Le chemin de la photo doit correspondre à son site'
);
reset role;

select tests.authenticate_as_anon();
select results_eq(
  format($$ select jsonb_array_length(photos), photos -> 0 ->> 'path', photos -> 0 ->> 'caption'
            from public.story_sites where id = %L $$, :'site_id'),
  format($$ values (1, %L::text, 'Vue fictive'::text) $$, :'alice_path'),
  'Les photos du site sont publiées avec leur légende dans la story map'
);
reset role;

-- Miniatures ------------------------------------------------------------------------------
select tests.authenticate_as(:'alice_id');
select lives_ok(
  format($$ insert into public.site_photos (site_id, storage_path, thumb_path)
            values (%L, %L, %L) $$,
         :'site_id', format('%s/%s/photo-2.jpg', :'alice_id', :'site_id'), format('%s/%s/photo-2-thumb.jpg', :'alice_id', :'site_id')),
  'Une photo est enregistrée avec sa miniature'
);
select throws_ok(
  format($$ insert into public.site_photos (site_id, storage_path, thumb_path)
            values (%L, %L, %L) $$,
         :'site_id', format('%s/%s/photo-3.jpg', :'alice_id', :'site_id'), format('%s/%s/thumb.jpg', :'bob_id', :'site_id')),
  '42501', null,
  'La miniature doit se trouver dans le dossier du collecteur'
);
select throws_ok(
  format($$ insert into public.site_photos (site_id, storage_path, thumb_path)
            values (%L, %L, %L) $$,
         :'site_id', format('%s/%s/photo-4.jpg', :'alice_id', :'site_id'), format('%s/%s/thumb.jpg', :'alice_id', :'bob_site_id')),
  '23514', null,
  'La miniature doit correspondre au site de la photo'
);
reset role;

select tests.authenticate_as_anon();
select is(
  (select photos -> 1 ->> 'thumb' from public.story_sites where id = :'site_id'),
  format('%s/%s/photo-2-thumb.jpg', :'alice_id', :'site_id'),
  'La miniature est publiée dans la story map'
);
reset role;

select tests.authenticate_as(:'bob_id');
delete from public.site_photos where site_id = :'site_id';
reset role;
select is(
  (select count(*)::int from public.site_photos where site_id = :'site_id'),
  2,
  'Un autre collecteur ne peut pas supprimer les photos'
);

select tests.authenticate_as(:'alice_id');
delete from public.sites where id = :'site_id';
reset role;
select is(
  (select count(*)::int from public.site_photos where site_id = :'site_id'),
  0,
  'Supprimer un site supprime ses photos enregistrées'
);

select * from finish();
rollback;
