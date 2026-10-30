import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CENTER, DEFAULT_ZOOM, SITE_ZOOM, createTileLayer, pinIcon } from '../lib/map'

export interface PickedLocation {
  latitude: number
  longitude: number
  accuracy: number | null
}

type GpsError = 'gps.denied' | 'gps.unavailable' | 'gps.timeout' | 'gps.unsupported'

interface LocationPickerProps {
  value: PickedLocation | null
  /** Position suivie depuis l'ouverture de l'application, réutilisée si elle est récente. */
  userPosition?: (PickedLocation & { timestamp: number }) | null
  onChange: (value: PickedLocation) => void
}

const FRESH_POSITION_MS = 60_000

export function LocationPicker({ value, userPosition = null, onChange }: LocationPickerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const [locating, setLocating] = useState(false)
  const [gpsError, setGpsError] = useState<GpsError | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    createTileLayer().addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) =>
      onChangeRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng, accuracy: null }),
    )
    mapRef.current = map
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return
    const position: L.LatLngTuple = [value.latitude, value.longitude]
    if (!markerRef.current) {
      const marker = L.marker(position, { icon: pinIcon(), draggable: true, keyboard: false }).addTo(map)
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        onChangeRef.current({ latitude: lat, longitude: lng, accuracy: null })
      })
      markerRef.current = marker
      map.setView(position, SITE_ZOOM, { animate: false })
    } else {
      markerRef.current.setLatLng(position)
      if (!map.getBounds().contains(position)) map.panTo(position)
    }
  }, [value])

  function locate() {
    if (userPosition && Date.now() - userPosition.timestamp < FRESH_POSITION_MS) {
      const { latitude, longitude, accuracy } = userPosition
      setGpsError(null)
      onChange({ latitude, longitude, accuracy })
      mapRef.current?.setView([latitude, longitude], SITE_ZOOM, { animate: false })
      return
    }
    if (!('geolocation' in navigator)) {
      setGpsError('gps.unsupported')
      return
    }
    setLocating(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        })
        mapRef.current?.setView([position.coords.latitude, position.coords.longitude], SITE_ZOOM, { animate: false })
      },
      (error) => {
        setLocating(false)
        setGpsError(
          error.code === error.PERMISSION_DENIED
            ? 'gps.denied'
            : error.code === error.TIMEOUT
              ? 'gps.timeout'
              : 'gps.unavailable',
        )
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  return (
    <div className="location-picker">
      <button type="button" className="button button--primary" onClick={locate} disabled={locating}>
        {locating ? t('collect.locating') : t('collect.useGps')}
      </button>
      {gpsError && (
        <p className="form-error" role="alert">
          {t(gpsError)}
        </p>
      )}
      <p className="field-hint">{t('collect.locationHint')}</p>
      <div ref={containerRef} className="location-picker__map" />
      <p className="location-picker__value" aria-live="polite">
        {value ? (
          <>
            {t('collect.coordinates', { lat: value.latitude.toFixed(5), lng: value.longitude.toFixed(5) })}
            {value.accuracy !== null && ` (${t('collect.accuracy', { meters: Math.round(value.accuracy) })})`}
          </>
        ) : (
          t('collect.noLocation')
        )}
      </p>
    </div>
  )
}
