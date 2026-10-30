import { createContext, use } from 'react'

export interface UserPosition {
  latitude: number
  longitude: number
  accuracy: number | null
  timestamp: number
}

export type GeolocationStatus = 'locating' | 'ready' | 'denied' | 'unavailable' | 'unsupported'

export interface GeolocationValue {
  status: GeolocationStatus
  position: UserPosition | null
  /** Relance la localisation (après un refus ou une erreur). */
  request: () => void
}

export const GeolocationContext = createContext<GeolocationValue | null>(null)

export function useGeolocation(): GeolocationValue {
  const value = use(GeolocationContext)
  if (!value) throw new Error('useGeolocation doit être utilisé dans <GeolocationProvider>.')
  return value
}
