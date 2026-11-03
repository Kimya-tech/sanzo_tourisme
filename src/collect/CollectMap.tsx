import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CENTER, DEFAULT_ZOOM, addBaseLayers, pinIcon, prefersReducedMotion } from '../lib/map'
import type { MySite, SitePoint } from './api'
import type { UserPosition } from './geolocation-context'

const USER_ZOOM = 16

interface CollectMapProps {
  label: string
  userPosition: UserPosition | null
  mySites: MySite[]
  otherSites: SitePoint[]
  otherSiteLabel: string
  editLabel: string
  /** Incrémenté à chaque demande de recentrage sur l'utilisateur. */
  recenterSignal: number
  focusSiteId: string | null
  onEditSite: (id: string) => void
}

// Contenu de bulle construit en DOM (textContent) : aucun texte saisi n'est interprété comme du HTML.
function sitePopup(site: MySite, editLabel: string, onEdit: (id: string) => void): HTMLElement {
  const root = document.createElement('div')
  root.className = 'site-popup'
  const title = document.createElement('strong')
  title.textContent = site.name
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button button--small'
  button.textContent = editLabel
  button.addEventListener('click', () => onEdit(site.id))
  root.append(title, button)
  return root
}

function textElement(text: string): HTMLElement {
  const span = document.createElement('span')
  span.textContent = text
  return span
}

export function CollectMap({
  label,
  userPosition,
  mySites,
  otherSites,
  otherSiteLabel,
  editLabel,
  recenterSignal,
  focusSiteId,
  onEditSite,
}: CollectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const sitesLayerRef = useRef<L.LayerGroup | null>(null)
  const myMarkersRef = useRef(new Map<string, L.Marker>())
  const userLayerRef = useRef<{ dot: L.CircleMarker; halo: L.Circle } | null>(null)
  const centeredOnUserRef = useRef(false)
  const onEditRef = useRef(onEditSite)
  const { t } = useTranslation()
  const baseLayerLabelsRef = useRef({
    group: t('story.mapBackground'),
    plan: t('story.mapPlan'),
    satellite: t('story.mapSatellite'),
  })

  useEffect(() => {
    onEditRef.current = onEditSite
  }, [onEditSite])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, { zoomControl: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.control.zoom({ position: 'topright' }).addTo(map)
    addBaseLayers(map, baseLayerLabelsRef.current)
    // Calque dédié : la position de l'utilisateur reste visible au-dessus des repères des sites.
    map.createPane('userPosition').style.zIndex = '640'
    sitesLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)
    const myMarkers = myMarkersRef.current
    return () => {
      resizeObserver.disconnect()
      myMarkers.clear()
      map.remove()
      mapRef.current = null
      sitesLayerRef.current = null
      userLayerRef.current = null
      centeredOnUserRef.current = false
    }
  }, [])

  // Sites : ceux des autres en gris (repérage des doublons), les miens en couleur et modifiables.
  useEffect(() => {
    const layer = sitesLayerRef.current
    if (!layer) return
    layer.clearLayers()
    myMarkersRef.current.clear()
    const mine = new Set(mySites.map((site) => site.id))
    for (const site of otherSites) {
      if (mine.has(site.id)) continue
      L.circleMarker([site.latitude, site.longitude], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#78716c',
        fillOpacity: 0.9,
      })
        .bindTooltip(textElement(`${site.name} · ${otherSiteLabel}`))
        .addTo(layer)
    }
    for (const site of mySites) {
      const marker = L.marker([site.latitude, site.longitude], { icon: pinIcon(), title: site.name, alt: site.name })
        .bindPopup(sitePopup(site, editLabel, (id) => onEditRef.current(id)))
        .addTo(layer)
      myMarkersRef.current.set(site.id, marker)
    }
  }, [editLabel, mySites, otherSiteLabel, otherSites])

  // Position de l'utilisateur : point bleu et cercle de précision.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userPosition) return
    const latLng: L.LatLngTuple = [userPosition.latitude, userPosition.longitude]
    const radius = userPosition.accuracy ?? 0
    if (!userLayerRef.current) {
      const halo = L.circle(latLng, {
        pane: 'userPosition',
        radius,
        color: '#2563eb',
        weight: 1,
        fillColor: '#2563eb',
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map)
      const dot = L.circleMarker(latLng, {
        pane: 'userPosition',
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#2563eb',
        fillOpacity: 1,
        // Non cliquable : un repère de site situé au même endroit reste accessible.
        interactive: false,
      }).addTo(map)
      userLayerRef.current = { dot, halo }
    } else {
      userLayerRef.current.dot.setLatLng(latLng)
      userLayerRef.current.halo.setLatLng(latLng).setRadius(radius)
    }
    if (!centeredOnUserRef.current && !focusSiteId) {
      centeredOnUserRef.current = true
      map.setView(latLng, USER_ZOOM, { animate: false })
    }
  }, [focusSiteId, userPosition])

  useEffect(() => {
    const map = mapRef.current
    if (!map || recenterSignal === 0 || !userPosition) return
    map.flyTo([userPosition.latitude, userPosition.longitude], Math.max(map.getZoom(), USER_ZOOM), {
      animate: !prefersReducedMotion(),
    })
    // Recentrage uniquement à la demande, pas à chaque mise à jour de la position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal])

  // Site à mettre en avant (par exemple après son enregistrement).
  useEffect(() => {
    const map = mapRef.current
    const marker = focusSiteId ? myMarkersRef.current.get(focusSiteId) : undefined
    if (!map || !marker) return
    centeredOnUserRef.current = true
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), USER_ZOOM), { animate: false })
    marker.openPopup()
  }, [focusSiteId, mySites])

  return <div ref={containerRef} className="collect-map" role="region" aria-label={label} />
}
