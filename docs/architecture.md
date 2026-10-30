# Architecture et sécurité

## 1. Parcours

| Adresse | Public | Rôle |
| --- | --- | --- |
| `/fr`, `/en` | tout le monde | plateforme : miniatures des sites, carte, détails du site sélectionné, recherche |
| `/fr?site=<id>` | tout le monde | lien partageable : ouvre directement les détails d’un site |
| `/fr/collecte#code=<code>` | membres de l’association | première ouverture : nom du collecteur |
| `/fr/collecte` | collecteurs enregistrés | carte plein écran, position de l’utilisateur, bouton « Ajouter un site » |
| `/fr/collecte/nouveau`, `/fr/collecte/<id>` | collecteurs enregistrés | formulaire ouvert par-dessus la carte (saisie / modification) |
| `/fr/collecte/mes-sites` | collecteurs enregistrés | liste « Mes sites collectés » par-dessus la carte |

Une seule application Vite, déployée sur Vercel. L’application de collecte (formulaire, sélecteur de position,
préparation des photos) est chargée à la demande : elle n’alourdit pas la plateforme publique.

## 2. Plateforme

**Ordinateur** : en-tête avec la recherche ; à gauche, les miniatures des sites ; au centre, la carte ; à droite,
le panneau de détails (27 rem), ouvert uniquement lorsqu’un site est sélectionné.
**Téléphone** : la recherche passe sous le nom du site ; les miniatures forment une bande défilante en bas de la
carte ; un site sélectionné s’affiche sous la carte (38 % de la hauteur pour la carte).

- **Miniatures** : photo principale (version 480 px) de chaque site, en rouleau sans barre de défilement
  (3 miniatures nettes au centre, les autres réduites et estompées ; le site sélectionné est ramené au centre).
  Au survol, la miniature s’agrandit légèrement, affiche le nom du site (toujours affiché sur écran tactile) et
  le repère correspondant est mis en évidence sur la carte. Un site sans photo affiche « Pas encore de photo ».
- **Sélection** (clic sur une miniature, un repère ou une suggestion de recherche) : le panneau s’ouvre et la carte
  zoome sur le site. Fermeture par « × », la touche Échap ou le bouton Retour du navigateur.
- **Détails** : en-tête collant (reste visible au défilement) avec le nom, le raccourci « Aller vers ce site »
  (icône ronde, libellé en info-bulle et pour les lecteurs d’écran) et « × » ; puis la photo principale, un
  paragraphe, une autre photo, un
  paragraphe, etc. (chaque retour à la ligne de la description est un paragraphe ; photos ou paragraphes en
  surplus à la suite). Chaque photo est créditée au collecteur ; « Collecté par … le … » figure en bas du panneau,
  avant les boutons « Site précédent / suivant ».
- **Itinéraire** : « Aller vers ce site » ouvre Google Maps (application sur téléphone si elle est installée,
  sinon le site web, dans un nouvel onglet) avec l’itinéraire vers les coordonnées GPS du site, au départ de la
  position actuelle de l’utilisateur ; le mode de transport se choisit dans Google Maps. Lien du type
  `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` : aucune clé d’API ni aucun coût.
- **Recherche** (en-tête) : sans tenir compte des accents ni des majuscules, dans le nom, la description et le nom
  du collecteur ; les sites dont le nom correspond passent en premier. La saisie filtre aussitôt les miniatures et
  les repères, et propose des suggestions (flèches + Entrée, ou clic).
- L’adresse se met à jour (`?site=<id>`) : on peut partager le lien d’un site précis.
- Ordre des sites : `sort_order` (réglable par l’équipe), puis date de collecte.
- L’interface est bilingue ; les récits sont affichés dans leur langue de rédaction, avec la mention « Récit
  rédigé en … » s’ils diffèrent de la langue de l’interface. Aucune traduction n’est générée.
- Animations désactivées si le système le demande (`prefers-reduced-motion`).

## 3. Collecte

**Écran principal : carte plein écran.**

- Dès l’ouverture, l’application demande l’accès à la position du téléphone et la suit en continu : point bleu
  avec cercle de précision, carte centrée sur l’utilisateur. Le point bleu reste au-dessus des repères.
- Gros bouton « Ajouter un site » en bas de l’écran ; boutons « Me localiser » (recentrer) et « Mes sites ».
- Les sites du collecteur apparaissent en repères colorés : un appui ouvre une bulle avec « Modifier ». Les sites
  déjà publiés par les autres apparaissent en points gris, pour éviter les doublons.
- Si la localisation est refusée ou indisponible, un bandeau explique comment l’autoriser, avec un bouton
  « Activer la localisation ». La position peut toujours être placée à la main dans le formulaire.
- Le formulaire et la liste s’ouvrent par-dessus la carte (plein écran sur téléphone, panneau de 30 rem à droite
  sur ordinateur) ; « × » ou la touche Échap les ferment. La carte reste chargée derrière.
- Après l’enregistrement, retour à la carte avec un message de confirmation et la bulle du nouveau site ouverte.

**Déroulement.**

1. Chaque membre reçoit un lien personnel contenant son code : `…/fr/collecte#code=XXXX`. Le code est placé après `#`, donc il n’est
   jamais envoyé au serveur Vercel ni enregistré dans ses journaux ; l’application le retire aussitôt de la
   barre d’adresse.
2. À la première ouverture, la personne saisit son nom (panneau par-dessus la carte). L’application ouvre une
   **session anonyme** Supabase (aucun e-mail ni mot de passe, conservée sur l’appareil) et appelle
   `register_collector(code, nom)`.
3. Le nom est proposé par défaut comme « Nom du collecteur » de chaque nouveau site (modifiable).
4. Formulaire : nom, description, date de collecte (aujourd’hui par défaut, jamais dans le futur), nom du
   collecteur, position, photos (appareil photo ou galerie, légende facultative). La position d’un nouveau site
   suit le GPS du téléphone jusqu’à ce que la personne la déplace sur la mini-carte.
5. Les photos sont réduites à 1600 px et réencodées en JPEG sur le téléphone, avec une miniature de 480 px pour la
   liste des sites de la plateforme : envoi plus rapide en 3G, et
   suppression des métadonnées EXIF (dont la position GPS de l’appareil).
6. La saisie en cours est conservée sur l’appareil (brouillon) en cas de coupure ou de rechargement ; les photos,
   elles, devront être ajoutées de nouveau.
7. Si l’envoi d’une photo échoue, le site reste enregistré et les photos non envoyées restent affichées pour un
   nouvel essai.
8. Chaque collecteur retrouve ses sites, peut les corriger, ajouter ou retirer des photos, ou les supprimer.

Limite : la session étant liée à l’appareil et au navigateur, un collecteur qui change de téléphone (ou efface
les données du navigateur) se réenregistre avec le lien ; ses sites précédents restent publiés mais il ne peut
plus les modifier lui-même.

## 4. Données

Schéma : [supabase/migrations](../supabase/migrations).

| Table | Contenu |
| --- | --- |
| `collectors` | session anonyme → lien de collecte utilisé, nom du collecteur |
| `sites` | nom, description, date, collecteur, langue, latitude/longitude (+ `geography` PostGIS calculée), précision, `sort_order`, `is_published` |
| `site_photos` | chemin de la photo et de sa miniature dans le bucket, légende, dimensions, ordre |
| `private.collect_invites` | un lien de collecte par membre : libellé, code haché (SHA-256), actif ou non |
| `private.collect_code_failures` | tentatives de code erronées (limitation) |
| vue `story_sites` | sites publiés + photos (JSON), en une seule requête pour la plateforme |

Contrôles en base (doublés dans le formulaire) : nom 2–150 caractères, description 10–5000, date entre 2000 et
aujourd’hui, position au Cameroun (détecte l’inversion latitude/longitude), chemin de photo cohérent avec le site.

## 5. Sécurité

| Action | Visiteur | Session sans code | Collecteur | Équipe (tableau de bord Supabase) |
| --- | :-: | :-: | :-: | :-: |
| Voir les sites publiés et leurs photos | ✅ | ✅ | ✅ | ✅ |
| Créer un site, déposer des photos | ❌ | ❌ | ✅ | ✅ |
| Modifier / supprimer un site et ses photos | ❌ | ❌ | les siens | ✅ |
| Masquer un site (`is_published`), régler l’ordre | ❌ | ❌ | ❌ | ✅ |
| Créer / révoquer le lien d’un membre | ❌ | ❌ | ❌ | ✅ |
| Lire le code de collecte ou les identifiants des collecteurs | ❌ | ❌ | ❌ | ✅ |

- RLS active sur toutes les tables ; les privilèges par défaut de Supabase sont retirés puis accordés colonne
  par colonne (`is_published`, `created_by`, `sort_order`, `is_active` ne sont pas modifiables par l’API).
- Liens personnels : chaque membre a son propre code (24 caractères aléatoires, stocké haché). Révoquer le lien
  d’un membre retire l’accès à toutes ses sessions et empêche de se réenregistrer, même depuis un autre
  navigateur. 5 essais erronés par session puis blocage 15 minutes ; la création de sessions anonymes est
  elle-même limitée par Supabase (30 par heure et par adresse IP) : la recherche d’un code par essais est irréaliste.
- Photos : bucket public limité à JPEG/PNG/WebP de 5 Mo ; dépôt uniquement dans `<sa session>/<son site>/` ;
  aucun écrasement de fichier existant.
- Une relecture de sécurité a montré qu’un code unique partagé ne permettait pas de retirer réellement un accès
  (il suffisait d’ouvrir une nouvelle session) : d’où les liens personnels, testés en pgTAP et dans le navigateur.
- Les textes sont affichés par React (échappés) ; les repères et infobulles de la carte n’injectent aucun HTML
  saisi par les collecteurs.
- La clé secrète Supabase n’est jamais utilisée par l’application ; en-têtes de sécurité (CSP…) dans
  [vercel.json](../vercel.json).

## 6. Tests

| Niveau | Emplacement | Contenu |
| --- | --- | --- |
| pgTAP (53 tests) | [supabase/tests/database](../supabase/tests/database) | RLS, privilèges, liens personnels, révocation et limitation des essais, création / isolation / masquage des sites, photos, miniatures et stockage |
| Intégration (14 tests) | [tests/integration](../tests/integration) | vraie API locale : visiteur, session anonyme sans code, collecteur, isolation, photos publiques, fichiers non image |
| Unitaires et interface (75 tests) | `src/**/*.test.ts(x)` | plateforme (miniatures, ouverture / fermeture des détails, ordre photo / texte, bouton « Aller vers ce site » et lien Google Maps, survol, repères, précédent / suivant, lien partagé, langue, erreurs), recherche (filtre, accents, suggestions, clavier, aucun résultat), collecte (carte par défaut, bouton « Ajouter un site », formulaire, position, session périmée, accès désactivé, code dans le lien), validation, photos, brouillon, dates, traductions |

Scénarios de bout en bout vérifiés dans Microsoft Edge (compilation de production) :

- plateforme sur ordinateur (1366 px) : miniatures de 480 px, agrandissement au survol et repère mis en évidence,
  clic → panneau de détails et site centré sur la carte, ordre photo / texte / photo / texte, recherche « foret » →
  suggestion « Forêt » puis Entrée ; sur téléphone (375 px) : bande de miniatures en bas, détails sous la carte,
  aucun défilement horizontal ;
- collecte sur téléphone (375 px, GPS simulé) : lien → nom → carte plein écran avec point bleu et sites publiés en
  gris ; « Ajouter un site » → formulaire avec la position GPS pré-remplie (± 12 m) ; photo de 3000 × 2000 px
  envoyée en 1600 × 1067 ; retour à la carte avec confirmation et bulle du site ; « Modifier » depuis la bulle ;
  fermeture par Échap ; bandeau explicatif si la localisation est refusée ; panneau latéral sur ordinateur ;
  brouillon conservé après rechargement ; site visible immédiatement sur la plateforme, avec sa miniature de 480 px.

## 7. Performance

Premier chargement de la plateforme : environ 230 Ko compressés (React, Leaflet, Supabase, React Router,
i18next et ~9 Ko de code applicatif), en fichiers séparés mis en cache d’un déploiement à l’autre. Les photos
sont chargées au fil du défilement (`loading="lazy"`), avec leurs dimensions pour éviter les sauts de mise en page.
