import { describe, expect, it } from 'vitest'
import { interleaveContent, splitParagraphs } from './content'
import { normalizeText, searchSites } from './search'
import type { StoryPhoto, StorySite } from './useStorySites'

const photo = (id: string): StoryPhoto => ({ id, path: `${id}.jpg`, thumb: null, caption: null, width: null, height: null })
const kinds = (blocks: ReturnType<typeof interleaveContent>) =>
  blocks.map((block) => (block.type === 'photo' ? `photo:${block.photo.id}` : `text:${block.text}`))

describe('splitParagraphs', () => {
  it('découpe sur les retours à la ligne et ignore les lignes vides', () => {
    expect(splitParagraphs('Un.\n\nDeux.\r\nTrois.\n   \n')).toEqual(['Un.', 'Deux.', 'Trois.'])
  })
})

describe('interleaveContent', () => {
  it('alterne photo principale, texte, photo, texte', () => {
    expect(kinds(interleaveContent([photo('a'), photo('b')], ['T1', 'T2']))).toEqual([
      'photo:a',
      'text:T1',
      'photo:b',
      'text:T2',
    ])
  })

  it('place les paragraphes en surplus à la suite', () => {
    expect(kinds(interleaveContent([photo('a')], ['T1', 'T2', 'T3']))).toEqual(['photo:a', 'text:T1', 'text:T2', 'text:T3'])
  })

  it('place les photos en surplus à la suite', () => {
    expect(kinds(interleaveContent([photo('a'), photo('b'), photo('c')], ['T1']))).toEqual([
      'photo:a',
      'text:T1',
      'photo:b',
      'photo:c',
    ])
  })

  it('fonctionne sans photo', () => {
    expect(kinds(interleaveContent([], ['T1', 'T2']))).toEqual(['text:T1', 'text:T2'])
  })
})

const site = (id: string, name: string, description = '', collectorName = 'Alice'): StorySite => ({
  id,
  name,
  description,
  collectedOn: '2026-10-01',
  collectorName,
  language: 'fr',
  category: null,
  latitude: 5.28,
  longitude: 9.98,
  photos: [],
})

describe('searchSites', () => {
  const sites = [
    site('1', 'Lac Assango', 'Un lac entouré de forêt.'),
    site('2', 'Forêt des singes', 'Primates et sentiers.'),
    site('3', 'Rocher', 'Vue panoramique.', 'Bernard'),
  ]

  it('ignore les accents et les majuscules', () => {
    expect(normalizeText('  Forêt ÉLÉPHANT ')).toBe('foret elephant')
    expect(searchSites(sites, 'FORET').map((s) => s.id)).toEqual(['2', '1'])
  })

  it('classe les correspondances dans le nom en premier', () => {
    expect(searchSites(sites, 'foret').map((s) => s.id)).toEqual(['2', '1'])
  })

  it('exige tous les mots recherchés', () => {
    expect(searchSites(sites, 'lac foret').map((s) => s.id)).toEqual(['1'])
    expect(searchSites(sites, 'lac singes')).toEqual([])
  })

  it('cherche aussi dans le nom du collecteur', () => {
    expect(searchSites(sites, 'bernard').map((s) => s.id)).toEqual(['3'])
  })

  it('retourne tous les sites pour une recherche vide', () => {
    expect(searchSites(sites, '   ')).toBe(sites)
  })
})
