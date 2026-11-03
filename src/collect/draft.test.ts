import { describe, expect, it } from 'vitest'
import { clearDraft, loadDraft, saveDraft, type SiteDraft } from './draft'

const draft: SiteDraft = {
  name: 'Site',
  category: 'culture',
  description: 'Texte en cours',
  collectedOn: '2026-10-29',
  collectorName: 'Alice',
  latitude: 5.28,
  longitude: 9.98,
  accuracy: 12,
}

describe('brouillon de collecte', () => {
  it('est conservé puis restauré', () => {
    saveDraft(draft)
    expect(loadDraft()).toEqual(draft)
  })

  it('n’enregistre pas un formulaire vide', () => {
    saveDraft({ ...draft, name: '', description: '', latitude: null, longitude: null })
    expect(loadDraft()).toBeNull()
  })

  it('est effacé après enregistrement du site', () => {
    saveDraft(draft)
    clearDraft()
    expect(loadDraft()).toBeNull()
  })

  it('ignore un contenu corrompu', () => {
    localStorage.setItem('tourisme-sanzo.collect.draft', '{pas du json')
    expect(loadDraft()).toBeNull()
    localStorage.setItem('tourisme-sanzo.collect.draft', JSON.stringify({ name: 3, category: 'plage', latitude: 'x' }))
    expect(loadDraft()).toEqual({
      name: '',
      category: '',
      description: '',
      collectedOn: '',
      collectorName: '',
      latitude: null,
      longitude: null,
      accuracy: null,
    })
  })
})
