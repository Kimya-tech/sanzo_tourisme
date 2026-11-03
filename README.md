# Tourisme Sanzo

Plateforme bilingue (français / anglais) des sites touristiques de la communauté Sanzo (région de l’Ouest,
Cameroun), alimentée par une application de collecte utilisée par les membres de l’association.

- **Plateforme** (`/fr`, `/en`) : page unique, ouverte à tous, sans compte. En-tête avec le logo du CODESA et la
  recherche ; à gauche les miniatures des sites (en rouleau, nom du site central affiché) ; au centre la carte
  (repères colorés par catégorie avec légende, vue plan ou satellite, regroupement au-delà de 50 sites) ; à
  droite, un accueil (présentation de Sanzo, sites à découvrir) puis, au clic sur un site, ses détails (en-tête
  collant avec un raccourci « Aller vers ce site » qui ouvre l’itinéraire dans Google Maps, catégorie, puis photo
  principale, texte, photo, texte… ; photos agrandissables en plein écran) pendant que la carte zoome sur le
  site. Pied de page et page `/fr/infos` : à propos, contribuer, contact, mentions légales.
- **Collecte** (`/fr/collecte`) : application web pour téléphone, installable sur l’écran d’accueil. Chaque
  membre de l’association reçoit un lien personnel (révocable) contenant son code d’accès. L’écran principal est
  une carte plein écran qui suit la position du téléphone (autorisation demandée à l’ouverture), avec un grand
  bouton « Ajouter un site ». Le formulaire s’ouvre par-dessus la carte : nom, catégorie, description, date de
  collecte, nom du collecteur (enregistré à la première ouverture), position GPS pré-remplie et photos. Les sites
  apparaissent immédiatement sur la plateforme.

| Couche | Technologie |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, i18next, Leaflet |
| Backend | Supabase : PostgreSQL + PostGIS, Auth (sessions anonymes), Storage, RLS |
| Hébergement | Vercel (sous-domaine `*.vercel.app`) |

Documentation :

- [Architecture et sécurité](docs/architecture.md)
- [Déploiement, gestion du code de collecte, sauvegarde](docs/exploitation.md)
- [Points à valider](docs/decisions-a-valider.md)

## Démarrage en local

Prérequis : Node.js 22.22 ou plus récent, Docker Desktop.

```powershell
npm ci
npm run db:start      # Supabase en local (Docker)
npm run db:reset      # migrations + données de démonstration (sites et photos FICTIFS)
Copy-Item .env.example .env.local   # puis renseigner les valeurs de « npx supabase status »
npm run dev
```

| Adresse | Contenu |
| --- | --- |
| http://localhost:5173/fr | plateforme |
| http://localhost:5173/fr/collecte#code=SANZO-DEMO-2026 | collecte (code de démonstration local) |
| http://127.0.0.1:54321 | API Supabase locale |

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | vérification des types et compilation de production (`dist/`) |
| `npm run preview` | sert la compilation de production sur http://localhost:4173 |
| `npm run lint` | ESLint |
| `npm test` | tests unitaires et d’interface (Vitest, jsdom) |
| `npm run test:integration` | tests contre l’API Supabase **locale** (sessions anonymes, RLS, Storage) |
| `npm run db:test` | tests SQL pgTAP |
| `npm run db:demo-photos` | ajoute les photos de démonstration (illustrations générées, local uniquement) ; inclus dans `db:reset` |
| `npm run db:types` | régénère `src/lib/database.types.ts` après une migration |
| `npm run check` | types + lint + tests unitaires |

Validation complète :

```powershell
npm run db:reset; npm run db:test; npm run check; npm run test:integration; npm run build
```

## Organisation du dépôt

```
src/
  storymap/     plateforme : accueil, miniatures, carte Leaflet et légende, détails des sites, visionneuse, recherche
  collect/      application de collecte (chargée à la demande)
  app/          routeur, langue dans l'URL
  components/   composants partagés (logo, pied de page…)
  pages/        page d'informations, page introuvable
  i18n/         traductions FR/EN typées
  lib/          client Supabase, carte (plan / satellite), catégories, dates, erreurs, configuration
supabase/
  migrations/   schéma versionné (source de vérité)
  tests/        tests pgTAP
  seed.sql      données de démonstration locales
scripts/        photos de démonstration locales (demo-photos.mjs), transfert d'un site vers la production
tests/integration/   tests contre l'API Supabase locale
public/         logo du CODESA, photo de couverture, icônes et manifeste de l'application de collecte
```

## Sécurité : règles impératives

- La clé `service_role` / secrète (`sb_secret_…`) ne doit **jamais** être placée dans une variable `VITE_`, dans
  le dépôt ou dans le navigateur. La compilation échoue si une telle clé est détectée.
- Les codes de collecte ne sont jamais écrits dans le dépôt : ils sont créés dans Supabase (voir
  [exploitation.md](docs/exploitation.md)).
- Toute nouvelle table doit activer la RLS et recevoir des privilèges explicites (un test pgTAP le vérifie).

## Dépannage

**`supabase start` échoue avec « exit 139 » sous Windows / WSL2.** Certaines images Docker Supabase récentes
plantent sur les noyaux WSL2 récents. Contournement local (fichiers non versionnés) :

```powershell
Set-Content -NoNewline supabase\.temp\storage-version v1.84.0
Set-Content -NoNewline supabase\.temp\pgmeta-version v0.99.0
npx supabase start -x studio,vector,supavisor,imgproxy
```

**Tests unitaires interrompus par manque de mémoire.** Vitest est limité à 2 processus (`vitest.config.ts`) ; si la
machine manque encore de mémoire : `npx vitest run --project unit --maxWorkers=1`.

**La position ne s'affiche pas sur un vrai téléphone en local.** Les navigateurs n'autorisent la géolocalisation
qu'en HTTPS (ou sur `localhost`). Une adresse `http://192.168.…` ne fonctionne pas : tester sur un déploiement
de prévisualisation Vercel (HTTPS), ou via un tunnel HTTPS.
