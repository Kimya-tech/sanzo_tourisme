import { isInCameroon } from '../lib/geo'
import type { Category } from '../lib/categories'

export interface SiteFormValues {
  name: string
  category: Category | ''
  description: string
  collectedOn: string
  collectorName: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
}

export type SiteFormError =
  | 'validation.nameRequired'
  | 'validation.categoryRequired'
  | 'validation.descriptionRequired'
  | 'validation.dateRequired'
  | 'validation.collectorRequired'
  | 'validation.locationRequired'
  | 'validation.locationOutside'

// Mêmes règles que les contraintes SQL de la table sites.
export function validateSiteForm(values: SiteFormValues, today: string): SiteFormError[] {
  const errors: SiteFormError[] = []
  const length = (value: string) => value.trim().length

  if (length(values.name) < 2 || length(values.name) > 150) errors.push('validation.nameRequired')
  if (!values.category) errors.push('validation.categoryRequired')
  if (length(values.description) < 10 || length(values.description) > 5000) {
    errors.push('validation.descriptionRequired')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.collectedOn) || values.collectedOn > today || values.collectedOn < '2000-01-01') {
    errors.push('validation.dateRequired')
  }
  if (length(values.collectorName) < 2 || length(values.collectorName) > 80) {
    errors.push('validation.collectorRequired')
  }
  if (values.latitude === null || values.longitude === null) {
    errors.push('validation.locationRequired')
  } else if (!isInCameroon(values.latitude, values.longitude)) {
    errors.push('validation.locationOutside')
  }
  return errors
}
