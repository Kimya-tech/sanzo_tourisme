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

// Vue satellite : imagerie Esri (World Imagery) et, par-dessus, les noms de lieux et frontières.
// Configurable pour la production (fournisseur avec clé, par exemple MapTiler).
const SATELLITE_URL =
  import.meta.env.VITE_SATELLITE_TILE_URL ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_LABELS_URL =
  import.meta.env.VITE_SATELLITE_LABELS_URL ??
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTRIBUTION =
  import.meta.env.VITE_SATELLITE_ATTRIBUTION ||
  'Imagerie &copy; Esri, Maxar, Earthstar Geographics et la communauté des utilisateurs SIG'

function createSatelliteLayer(): L.Layer {
  // Au-delà du niveau 17, l'imagerie est souvent absente en zone rurale : les tuiles sont agrandies.
  const options = { maxNativeZoom: 17, maxZoom: 19 }
  const imagery = L.tileLayer(SATELLITE_URL, { ...options, attribution: SATELLITE_ATTRIBUTION })
  return SATELLITE_LABELS_URL ? L.layerGroup([imagery, L.tileLayer(SATELLITE_LABELS_URL, options)]) : imagery
}

export type BaseLayer = 'plan' | 'satellite'

const BASE_LAYER_KEY = 'tourisme-sanzo.map.base'

function rememberedBaseLayer(): BaseLayer {
  try {
    return localStorage.getItem(BASE_LAYER_KEY) === 'satellite' ? 'satellite' : 'plan'
  } catch {
    return 'plan'
  }
}

interface BaseLayerLabels {
  group: string
  plan: string
  satellite: string
}

/** Ajoute le fond de carte (plan ou satellite, choix mémorisé) et le sélecteur « Plan / Satellite ». */
export function addBaseLayers(map: L.Map, labels: BaseLayerLabels, position: L.ControlPosition = 'topright') {
  const layers: Record<BaseLayer, L.Layer> = { plan: createTileLayer(), satellite: createSatelliteLayer() }
  let current = rememberedBaseLayer()
  layers[current].addTo(map)

  const Switcher = L.Control.extend({
    onAdd() {
      const root = L.DomUtil.create('div', 'leaflet-bar basemap-switcher')
      root.setAttribute('role', 'group')
      root.setAttribute('aria-label', labels.group)
      const buttons = (Object.keys(layers) as BaseLayer[]).map((key) => {
        const button = L.DomUtil.create('button', '', root)
        button.type = 'button'
        button.textContent = labels[key]
        button.setAttribute('aria-pressed', String(key === current))
        L.DomEvent.on(button, 'click', () => {
          if (key === current) return
          map.removeLayer(layers[current])
          layers[key].addTo(map)
          current = key
          for (const [index, other] of (Object.keys(layers) as BaseLayer[]).entries()) {
            buttons[index]?.setAttribute('aria-pressed', String(other === key))
          }
          try {
            localStorage.setItem(BASE_LAYER_KEY, key)
          } catch {
            // Choix simplement non mémorisé.
          }
        })
        return button
      })
      L.DomEvent.disableClickPropagation(root)
      return root
    },
  })
  new Switcher({ position }).addTo(map)
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

// Repère en HTML/CSS : évite les images d'icônes par défaut de Leaflet (mal gérées par les bundlers).
// La couleur du repère est celle de la catégorie du site.
export type SiteMarkerState = 'default' | 'hovered' | 'active'

export function siteMarkerIcon(state: SiteMarkerState, color: string): L.DivIcon {
  const size = state === 'active' ? 32 : state === 'hovered' ? 26 : 20
  return L.divIcon({
    className: `map-marker is-${state}`,
    html: `<span style="--marker-color:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function pinIcon(): L.DivIcon {
  return L.divIcon({ className: 'map-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] })
}
