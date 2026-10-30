import { useEffect, useRef } from 'react'
import L from 'leaflet'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  SITE_ZOOM,
  createTileLayer,
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

function tooltip(text: string): HTMLElement {
  const span = document.createElement('span')
  span.textContent = text
  return span
}

export function SiteMap({ sites, activeId, hoveredId, onSelect, label }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef(new Map<string, L.Marker>())
  const onSelectRef = useRef(onSelect)
  const previousActiveRef = useRef<string | null>(null)
  const sitesRef = useRef(sites)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.control.zoom({ position: 'topright' }).addTo(map)
    createTileLayer().addTo(map)
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)
    const markers = markersRef.current
    return () => {
      resizeObserver.disconnect()
      markers.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Repères des sites affichés.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    markers.forEach((marker) => marker.remove())
    markers.clear()
    for (const site of sites) {
      const marker = L.marker([site.latitude, site.longitude], {
        icon: siteMarkerIcon('default'),
        title: site.name,
        alt: site.name,
        keyboard: true,
        riseOnHover: true,
      })
        .bindTooltip(tooltip(site.name), { direction: 'top', offset: [0, -12] })
        .addTo(map)
      marker.on('click keypress', () => onSelectRef.current(site.id))
      markers.set(site.id, marker)
    }
  }, [sites])

  // Aspect des repères : sélectionné, survolé (depuis la liste des miniatures) ou normal.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const state: SiteMarkerState = id === activeId ? 'active' : id === hoveredId ? 'hovered' : 'default'
      marker.setIcon(siteMarkerIcon(state)).setZIndexOffset(state === 'default' ? 0 : 1000)
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
