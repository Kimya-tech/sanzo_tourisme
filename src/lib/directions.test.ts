import { describe, expect, it } from 'vitest'
import { googleMapsDirectionsUrl } from './directions'

describe('googleMapsDirectionsUrl', () => {
  it('construit un lien d’itinéraire Google Maps vers les coordonnées du site', () => {
    expect(googleMapsDirectionsUrl(5.28, 9.98)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=5.280000%2C9.980000',
    )
  })

  it('arrondit à 6 décimales (environ 10 cm)', () => {
    const url = new URL(googleMapsDirectionsUrl(5.2905123456, 9.9701987654))
    expect(url.searchParams.get('destination')).toBe('5.290512,9.970199')
    expect(url.searchParams.has('origin')).toBe(false)
  })
})
