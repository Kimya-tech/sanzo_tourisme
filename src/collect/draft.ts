// Brouillon du formulaire conservé sur l'appareil : une coupure de réseau ou un rechargement
// ne fait pas perdre la saisie. Les photos ne sont pas conservées (taille du stockage local).

import { isCategory, type Category } from '../lib/categories'

export interface SiteDraft {
  name: string
  category: Category | ''
  description: string
  collectedOn: string
  collectorName: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
}

const KEY = 'tourisme-sanzo.collect.draft'

export function loadDraft(): SiteDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SiteDraft>
    if (typeof value !== 'object' || value === null) return null
    const text = (v: unknown) => (typeof v === 'string' ? v : '')
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    return {
      name: text(value.name),
      category: isCategory(value.category) ? value.category : '',
      description: text(value.description),
      collectedOn: text(value.collectedOn),
      collectorName: text(value.collectorName),
      latitude: num(value.latitude),
      longitude: num(value.longitude),
      accuracy: num(value.accuracy),
    }
  } catch {
    return null
  }
}

export function isDraftEmpty(draft: SiteDraft): boolean {
  return !draft.name.trim() && !draft.description.trim() && draft.latitude === null
}

export function saveDraft(draft: SiteDraft): void {
  try {
    if (isDraftEmpty(draft)) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // Stockage indisponible : le brouillon n'est simplement pas conservé.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignoré.
  }
}
