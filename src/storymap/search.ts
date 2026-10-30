import type { StorySite } from './useStorySites'

// Recherche sans accents ni majuscules : « foret » trouve « Forêt ».
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Sites dont le nom, la description ou le collecteur contiennent tous les mots recherchés.
 * Les sites dont le nom correspond apparaissent en premier ; l'ordre d'origine est conservé sinon.
 */
export function searchSites(sites: StorySite[], query: string): StorySite[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return sites
  const scored = sites.flatMap((site, index) => {
    const name = normalizeText(site.name)
    const text = `${name} ${normalizeText(site.description)} ${normalizeText(site.collectorName)}`
    if (!words.every((word) => text.includes(word))) return []
    const nameScore = words.filter((word) => name.includes(word)).length
    return [{ site, index, nameScore }]
  })
  return scored.sort((a, b) => b.nameScore - a.nameScore || a.index - b.index).map((item) => item.site)
}
