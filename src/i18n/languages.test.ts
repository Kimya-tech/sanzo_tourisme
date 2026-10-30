import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import { languageFromPath, preferredLanguage, rememberLanguage, switchLanguageInPath } from './languages'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) }
  }, {})
}

const placeholders = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()

describe('traductions', () => {
  const frKeys = flatten(fr)
  const enKeys = flatten(en)

  it('ont exactement les mêmes clés en français et en anglais', () => {
    expect(Object.keys(enKeys).sort()).toEqual(Object.keys(frKeys).sort())
  })

  it('ne contiennent aucun libellé vide', () => {
    for (const [key, value] of [...Object.entries(frKeys), ...Object.entries(enKeys)]) {
      expect(value.trim(), key).not.toBe('')
    }
  })

  it('utilisent les mêmes variables d’interpolation', () => {
    for (const [key, value] of Object.entries(frKeys)) {
      expect(placeholders(enKeys[key] ?? ''), key).toEqual(placeholders(value))
    }
  })
})

describe('langues dans les URL', () => {
  it('lit la langue du chemin', () => {
    expect(languageFromPath('/en/sites/x')).toBe('en')
    expect(languageFromPath('/de/sites')).toBeNull()
    expect(languageFromPath('/')).toBeNull()
  })

  it('change uniquement le préfixe de langue', () => {
    expect(switchLanguageInPath('/fr/sites/rocher-aleh', 'en')).toBe('/en/sites/rocher-aleh')
    expect(switchLanguageInPath('/fr', 'en')).toBe('/en')
    expect(switchLanguageInPath('/', 'en')).toBe('/en')
    expect(switchLanguageInPath('/carte', 'fr')).toBe('/fr/carte')
  })

  it('mémorise la langue choisie', () => {
    rememberLanguage('en')
    expect(preferredLanguage()).toBe('en')
    rememberLanguage('fr')
    expect(preferredLanguage()).toBe('fr')
  })
})
