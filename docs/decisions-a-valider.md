# Points à valider

## Choix appliqués (à confirmer à l’usage)

| Sujet | En place |
| --- | --- |
| Publication | Immédiate, sans validation : chaque membre connu reçoit un lien de collecte personnel, révocable. L’équipe peut masquer un site depuis le tableau de bord Supabase. |
| Champs de la collecte | Nom du site, description, date de collecte, nom du collecteur, position GPS, photos (facultatives, avec légende). Pas de catégorie ni de village pour l’instant. |
| Langue des récits | Rédigés dans la langue de l’interface utilisée lors de la collecte ; affichés tels quels avec une mention dans l’autre langue. |
| Ordre du parcours | Date de collecte, sauf ordre choisi par l’équipe (`sort_order`). |
| Centre de la carte | Approximativement Santchou (5,28° N ; 9,98° E) ; la carte se recentre ensuite sur l’ensemble des sites. |
| Modification d’un site | Par son collecteur, depuis le même téléphone. |

## Questions ouvertes

- Faut-il un petit écran d’administration (masquer, réordonner, corriger) plutôt que le tableau de bord Supabase ?
- Faut-il ajouter une catégorie ou le village du site (filtre ou couleur des repères) ?
- Faut-il traduire certains récits (champ anglais saisi par l’équipe) ?
- Faut-il une vue satellite ? Le fond de carte OpenStreetMap convient pour démarrer, mais ses serveurs publics
  interdisent un usage intensif : prévoir un fournisseur (MapTiler, Stadia, Thunderforest…) si l’audience grandit.
- Logo, photo de couverture et texte d’introduction définitifs.

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
