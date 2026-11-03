// Catégories des sites (mêmes valeurs que la contrainte SQL de public.sites.category).
// La couleur sert au repère sur la carte, à la légende et à l'étiquette de la fiche.
export const CATEGORIES = ['nature', 'history', 'culture', 'village', 'food', 'event'] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_COLORS: Record<Category, string> = {
  nature: '#15803d',
  history: '#7c2d12',
  culture: '#ea580c',
  village: '#1d4ed8',
  food: '#be185d',
  event: '#7e22ce',
}

/** Sites sans catégorie (collectés avant leur introduction). */
export const UNCATEGORIZED_COLOR = '#57534e'

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

export function categoryColor(category: Category | null): string {
  return category ? CATEGORY_COLORS[category] : UNCATEGORIZED_COLOR
}
