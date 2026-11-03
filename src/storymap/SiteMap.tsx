import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { useTranslation } from 'react-i18next'
import { categoryColor } from '../lib/categories'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  SITE_ZOOM,
  addBaseLayers,
  prefersReducedMotion,
  siteMarkerIcon,
  type SiteMarkerState,
} from '../lib/map'
import type { StorySite } from './useStorySites'

interface SiteMapProps {
  /** Sites affichés (résultat de la recherche). */
  sites: StorySite[]
  activeId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  label: string
}

// Au-delà de ce nombre de sites, les repères proches sont regroupés (pastille avec le nombre de sites).
const CLUSTER_THRESHOLD = 50

// Extension Leaflet chargée seulement si nécessaire. Elle s'attache au « L » global : on l'expose d'abord,
// sinon l'ordre d'exécution de la version compilée peut la faire passer avant Leaflet.
let clusterPlugin: Promise<unknown> | null = null
function loadClusterPlugin(): Promise<unknown> {
  ;(window as unknown as { L?: typeof L }).L ??= L
  clusterPlugin ??= import('leaflet.markercluster')
  return clusterPlugin
}

function tooltip(text: string): HTMLElement {
  const span = document.createElement('span')
  span.textContent = text
  return span
}

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 34 : count < 100 ? 40 : 46
  return L.divIcon({
    className: 'map-cluster',
    html: `<span>${count}</span>`,
    iconSize: [size, size],
  })
}

export function SiteMap({ sites, activeId, hoveredId, onSelect, label }: SiteMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef(new Map<string, L.Marker>())
  const onSelectRef = useRef(onSelect)
  const previousActiveRef = useRef<string | null>(null)
  const sitesRef = useRef(sites)
  const labelsRef = useRef({ group: t('story.mapBackground'), plan: t('story.mapPlan'), satellite: t('story.mapSatellite') })

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.control.zoom({ position: 'topright' }).addTo(map)
    addBaseLayers(map, labelsRef.current)
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)
    const markers = markersRef.current
    return () => {
      resizeObserver.disconnect()
      markers.clear()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // Repères des sites affichés, regroupés quand ils sont nombreux.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    layerRef.current?.remove()
    markers.clear()
    for (const site of sites) {
      const marker = L.marker([site.latitude, site.longitude], {
        icon: siteMarkerIcon('default', categoryColor(site.category)),
        title: site.name,
        alt: site.name,
        keyboard: true,
        riseOnHover: true,
      }).bindTooltip(tooltip(site.name), { direction: 'top', offset: [0, -12] })
      marker.on('click keypress', () => onSelectRef.current(site.id))
      markers.set(site.id, marker)
    }

    let cancelled = false
    const show = (layer: L.LayerGroup) => {
      if (cancelled) return
      markers.forEach((marker) => layer.addLayer(marker))
      layer.addTo(map)
      layerRef.current = layer
    }
    if (sites.length > CLUSTER_THRESHOLD) {
      void loadClusterPlugin().then(() =>
        show(
          L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 45,
            disableClusteringAtZoom: SITE_ZOOM,
            iconCreateFunction: clusterIcon,
          }),
        ),
      )
    } else {
      show(L.layerGroup())
    }
    return () => {
      cancelled = true
    }
  }, [sites])

  // Aspect des repères : sélectionné, survolé (depuis la liste des miniatures) ou normal.
  useEffect(() => {
    const byId = new Map(sites.map((site) => [site.id, site]))
    markersRef.current.forEach((marker, id) => {
      const state: SiteMarkerState = id === activeId ? 'active' : id === hoveredId ? 'hovered' : 'default'
      marker
        .setIcon(siteMarkerIcon(state, categoryColor(byId.get(id)?.category ?? null)))
        .setZIndexOffset(state === 'default' ? 0 : 1000)
    })
  }, [activeId, hoveredId, sites])

  // Cadrage : zoom sur le site sélectionné, sinon vue d'ensemble des sites affichés.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // La largeur de la carte change quand le panneau de détails s'ouvre ou se ferme.
    map.invalidateSize({ pan: false })
    const animate = !prefersReducedMotion()
    const activeChanged = previousActiveRef.current !== activeId
    const sitesChanged = sitesRef.current !== sites
    previousActiveRef.current = activeId
    sitesRef.current = sites

    const active = activeId ? sites.find((site) => site.id === activeId) : undefined
    // Largeur couverte à gauche par la barre de miniatures semi-transparente (0 sur téléphone).
    const inset = parseFloat(getComputedStyle(map.getContainer()).getPropertyValue('--map-inset-left')) || 0
    if (active) {
      if (activeChanged || sitesChanged) {
        const zoom = Math.max(map.getZoom(), SITE_ZOOM)
        const center = map.unproject(map.project([active.latitude, active.longitude], zoom).subtract([inset / 2, 0]), zoom)
        map.flyTo(center, zoom, { animate, duration: 1 })
      }
    } else if (!activeId && sites.length > 0 && (activeChanged || sitesChanged)) {
      const bounds = L.latLngBounds(sites.map((site) => [site.latitude, site.longitude] as L.LatLngTuple))
      map.flyToBounds(bounds, {
        paddingTopLeft: [48 + inset, 48],
        paddingBottomRight: [48, 48],
        maxZoom: 14,
        animate,
        duration: 0.8,
      })
    }
  }, [activeId, sites])

  return <div ref={containerRef} className="site-map" role="region" aria-label={label} />
}
