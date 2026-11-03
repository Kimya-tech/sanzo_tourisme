/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Modèle d'URL des tuiles de la carte, ex. https://tile.openstreetmap.org/{z}/{x}/{y}.png */
  readonly VITE_MAP_TILE_URL?: string
  /** Attribution HTML du fond de carte. */
  readonly VITE_MAP_ATTRIBUTION?: string
  /** Modèle d'URL des tuiles de la vue satellite (par défaut : Esri World Imagery). */
  readonly VITE_SATELLITE_TILE_URL?: string
  /** Tuiles des noms de lieux affichées sur la vue satellite ; vide pour les désactiver. */
  readonly VITE_SATELLITE_LABELS_URL?: string
  /** Attribution HTML de la vue satellite. */
  readonly VITE_SATELLITE_ATTRIBUTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
