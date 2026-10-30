import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { GeolocationContext, type GeolocationStatus, type GeolocationValue, type UserPosition } from './geolocation-context'

interface Snapshot {
  status: GeolocationStatus
  position: UserPosition | null
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

// Suit la position du téléphone dès l'ouverture de l'application : le navigateur demande alors
// l'autorisation d'accès à la position.
export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    status: isSupported() ? 'locating' : 'unsupported',
    position: null,
  }))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isSupported()) return
    const geolocation = navigator.geolocation
    const watchId = geolocation.watchPosition(
      (position) =>
        setSnapshot({
          status: 'ready',
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            timestamp: position.timestamp,
          },
        }),
      (error) =>
        setSnapshot((current) => {
          if (error.code === error.PERMISSION_DENIED) return { status: 'denied', position: null }
          // Erreur passagère (signal GPS faible) : on garde la dernière position connue.
          if (current.position) return { status: 'ready', position: current.position }
          return { status: error.code === error.TIMEOUT ? 'locating' : 'unavailable', position: null }
        }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    )
    return () => geolocation.clearWatch(watchId)
  }, [attempt])

  const request = useCallback(() => {
    if (!isSupported()) return
    setSnapshot((current) => ({ status: 'locating', position: current.position }))
    setAttempt((value) => value + 1)
  }, [])

  const value = useMemo<GeolocationValue>(() => ({ ...snapshot, request }), [request, snapshot])
  return <GeolocationContext value={value}>{children}</GeolocationContext>
}
