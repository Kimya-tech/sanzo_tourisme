import { describe, expect, it } from 'vitest'
import { validateSiteForm, type SiteFormValues } from './validation'

const valid: SiteFormValues = {
  name: 'Lac fictif',
  description: 'Une description suffisamment longue.',
  collectedOn: '2026-10-29',
  collectorName: 'Alice',
  latitude: 5.28,
  longitude: 9.98,
  accuracy: 10,
}

describe('validateSiteForm', () => {
  it('accepte un site complet', () => {
    expect(validateSiteForm(valid, '2026-10-29')).toEqual([])
  })

  it('signale tous les champs manquants', () => {
    expect(
      validateSiteForm(
        { ...valid, name: ' ', description: 'court', collectedOn: '', collectorName: '', latitude: null, longitude: null },
        '2026-10-29',
      ),
    ).toEqual([
      'validation.nameRequired',
      'validation.descriptionRequired',
      'validation.dateRequired',
      'validation.collectorRequired',
      'validation.locationRequired',
    ])
  })

  it('refuse une date future', () => {
    expect(validateSiteForm({ ...valid, collectedOn: '2026-10-30' }, '2026-10-29')).toEqual(['validation.dateRequired'])
  })

  it('refuse une position hors du Cameroun (ex. latitude et longitude inversées)', () => {
    expect(validateSiteForm({ ...valid, latitude: 9.98, longitude: 5.28 }, '2026-10-29')).toEqual([
      'validation.locationOutside',
    ])
  })
})
