export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'fr'

const STORAGE_KEY = 'tourisme-sanzo.language'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function languageFromPath(pathname: string): Language | null {
  const segment = pathname.split('/')[1]
  return isLanguage(segment) ? segment : null
}

export function rememberLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Stockage indisponible (navigation privée) : la préférence n'est simplement pas conservée.
  }
}

export function preferredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Ignoré : voir rememberLanguage.
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : ''
  return isLanguage(browser) ? browser : DEFAULT_LANGUAGE
}

// Remplace le préfixe de langue d'une URL interne, en conservant le reste du chemin (slugs stables).
export function switchLanguageInPath(pathname: string, target: Language): string {
  const segments = pathname.split('/')
  if (isLanguage(segments[1])) {
    segments[1] = target
    return segments.join('/')
  }
  return `/${target}${pathname === '/' ? '' : pathname}`
}
