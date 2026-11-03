-- Tourisme Sanzo — données de DÉMONSTRATION pour l'environnement LOCAL uniquement
-- (exécutées par « supabase db reset », jamais en production).
-- Les sites ci-dessous sont FICTIFS : noms, textes et positions sont inventés pour tester l'interface.
-- Les photos de démonstration (illustrations abstraites) sont ajoutées par scripts/demo-photos.mjs.

-- Lien de collecte local : http://localhost:5173/fr/collecte#code=SANZO-DEMO-2026
select private.create_collect_invite('Démo', 'SANZO-DEMO-2026');

insert into public.sites (name, description, collected_on, collector_name, language, latitude, longitude, sort_order, category)
values
  ('[DÉMO] Point de vue fictif',
   E'Site fictif de démonstration. Ce premier paragraphe apparaît sous la photo principale, dans le panneau de droite.\n\n'
   'Le deuxième paragraphe vient après la deuxième photo : photos et textes alternent pour raconter le lieu.\n\n'
   'Le troisième paragraphe suit la troisième photo. Les vrais récits seront rédigés par les collecteurs.',
   date '2026-10-01', 'Équipe démo', 'fr', 5.300, 9.960, 1, 'nature'),
  ('[DÉMO] Lac fictif',
   E'Site fictif de démonstration. Cliquez sur une miniature à gauche : la carte zoome sur le site et ses informations s''affichent ici.\n\n'
   'Un deuxième paragraphe, placé après la deuxième photo.',
   date '2026-10-02', 'Équipe démo', 'fr', 5.282, 9.990, 2, 'nature'),
  ('[DÉMO] Forêt fictive',
   E'Site fictif de démonstration. Utilisez la recherche en haut de la page pour retrouver un site par son nom ou un mot de sa description.\n\n'
   'Les photos sont créditées au collecteur qui les a prises.',
   date '2026-10-03', 'Équipe démo', 'fr', 5.262, 9.972, 3, 'history'),
  ('[DEMO] Fictional village square',
   E'Fictional demo place, written in English to show how a story in another language is displayed.\n\n'
   'A second paragraph, displayed after the second photo.',
   date '2026-10-04', 'Demo team', 'en', 5.271, 10.006, 4, 'village');
