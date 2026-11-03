import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES, CATEGORY_COLORS, UNCATEGORIZED_COLOR } from '../lib/categories'
import type { StorySite } from './useStorySites'

const isWide = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 48rem)').matches === true

/** Légende des couleurs des repères : uniquement les catégories présentes sur la carte. */
export function MapLegend({ sites }: { sites: StorySite[] }) {
  const { t } = useTranslation()
  // Ouverte sur ordinateur, repliée sur téléphone (la carte y est plus petite).
  const [initiallyOpen] = useState(isWide)
  const present = CATEGORIES.filter((category) => sites.some((site) => site.category === category))
  const hasOther = sites.some((site) => site.category === null)
  if (present.length === 0) return null

  const items = [
    ...present.map((category) => ({ key: category, color: CATEGORY_COLORS[category], label: t(`categories.${category}`) })),
    ...(hasOther ? [{ key: 'other', color: UNCATEGORIZED_COLOR, label: t('story.uncategorized') }] : []),
  ]
  return (
    <details className="map-legend" open={initiallyOpen}>
      <summary>{t('story.legend')}</summary>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <span className="map-legend__dot" style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </details>
  )
}
