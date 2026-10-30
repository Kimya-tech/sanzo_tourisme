import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fond de carte : OpenStreetMap par défaut (usage modéré, attribution obligatoire).
// Pour la production, un fournisseur peut être configuré sans modifier le code.
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>'

// Centre approximatif de la zone de Santchou, à confirmer par l'association.
export const DEFAULT_CENTER: L.LatLngTuple = [5.28, 9.98]
export const DEFAULT_ZOOM = 12
export const SITE_ZOOM = 15

export { isInCameroon } from './geo'

export function createTileLayer(): L.TileLayer {
  return L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 })
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

// Repère en HTML/CSS : évite les images d'icônes par défaut de Leaflet (mal gérées par les bundlers).
export type SiteMarkerState = 'default' | 'hovered' | 'active'

export function siteMarkerIcon(state: SiteMarkerState): L.DivIcon {
  const size = state === 'active' ? 30 : state === 'hovered' ? 26 : 20
  return L.divIcon({
    className: `map-marker is-${state}`,
    html: '<span></span>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function pinIcon(): L.DivIcon {
  return L.divIcon({ className: 'map-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] })
}
