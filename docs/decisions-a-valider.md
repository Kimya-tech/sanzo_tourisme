# Points à valider

## Choix appliqués (à confirmer à l’usage)

| Sujet | En place |
| --- | --- |
| Publication | Immédiate, sans validation : chaque membre connu reçoit un lien de collecte personnel, révocable. L’équipe peut masquer un site depuis le tableau de bord Supabase. |
| Champs de la collecte | Nom du site, description, date de collecte, nom du collecteur, position GPS, photos (facultatives, avec légende). Pas de catégorie ni de village pour l’instant. |
| Langue des récits | Rédigés dans la langue de l’interface utilisée lors de la collecte ; affichés tels quels avec une mention dans l’autre langue. |
| Ordre du parcours | Date de collecte, sauf ordre choisi par l’équipe (`sort_order`). |
| Centre de la carte | Approximativement Santchou (5,28° N ; 9,98° E) ; la carte se recentre ensuite sur l’ensemble des sites. |
| Catégories | Six catégories du cahier des charges (patrimoine naturel, historique, culture et traditions, villages, gastronomie et savoir-faire, événements), couleur des repères et légende. Les sites antérieurs sans catégorie apparaissent en gris (« Autre »). |
| Accueil et identité | Logo du CODESA, photo de couverture (rocher Aleu Ngoueu), présentation reprise de mbosanzo.com, contacts du site de l’association (codesannzo@gmail.com, 699 83 72 27). |
| Sites « À découvrir » | Les trois premiers sites du parcours (`sort_order`) qui ont une photo. |
| Modification d’un site | Par son collecteur, depuis le même téléphone. |

## Questions ouvertes

- Faut-il un petit écran d’administration (masquer, réordonner, corriger) plutôt que le tableau de bord Supabase ?
- Faut-il ajouter le village du site (filtre) ? Faut-il filtrer la carte par catégorie (clic sur la légende) ?
- Faut-il traduire certains récits (champ anglais saisi par l’équipe) ?
- Fonds de carte : le plan OpenStreetMap et l’imagerie satellite Esri conviennent pour démarrer, mais leurs
  serveurs publics ne sont pas prévus pour un usage intensif (Esri demande désormais un compte ArcGIS pour un
  usage en production) : prévoir un fournisseur avec clé (MapTiler, Stadia…) si l’audience grandit, via les
  variables `VITE_MAP_*` et `VITE_SATELLITE_*`.
- Mentions légales : confirmer le nom officiel de l’éditeur, un responsable de la publication et l’adresse.

## Avant l’ouverture publique

- **Droits sur les photos** : les collecteurs doivent être auteurs des photos ou autorisés ; informer du crédit
  automatique « Photo : nom du collecteur ».
- **Personnes photographiées** : consentement pour toute personne reconnaissable.
- **Lieux sensibles** : convenir avec l’association des lieux ou rites à ne pas publier ; l’équipe peut masquer un
  site immédiatement.
- **Mentions légales et confidentialité** : la plateforme publie le nom des collecteurs et conserve une session
  anonyme sur leur appareil ; aucune autre donnée personnelle n’est collectée.
- **Offres Supabase / Vercel** : offre gratuite de Supabase mise en pause après 7 jours d’inactivité ; offre
  Hobby de Vercel réservée à un usage non commercial (à vérifier pour l’association).
- **Captcha** (facultatif) : Supabase peut exiger un captcha (Turnstile / hCaptcha) à l’ouverture des sessions
  anonymes, si des abus apparaissaient.
