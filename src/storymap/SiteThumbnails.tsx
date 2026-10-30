import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { photoUrl } from '../lib/supabase'
import type { StorySite } from './useStorySites'

interface SiteThumbnailsProps {
  sites: StorySite[]
  activeId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

// Même seuil que la mise en page « téléphone » de index.css : en dessous, la bande est horizontale.
const VERTICAL_LAYOUT = '(min-width: 48rem)'
// Nombre de miniatures pleinement visibles au centre du rouleau.
const FOCUS_COUNT = 3

const matches = (query: string) => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true

// Effet de rouleau : chaque miniature est inclinée, réduite et estompée selon sa distance au centre.
// Les styles sont posés directement sur les éléments pour éviter un rendu React à chaque défilement.
function applyRoll(viewport: HTMLElement) {
  const items = Array.from(viewport.querySelectorAll<HTMLElement>('.thumbs > li'))
  if (!matches(VERTICAL_LAYOUT)) {
    for (const item of items) item.removeAttribute('style')
    return
  }
  const [first, second] = items
  if (!first) return
  const pitch = second ? second.offsetTop - first.offsetTop : first.offsetHeight
  if (pitch <= 0) return
  const center = viewport.scrollTop + viewport.clientHeight / 2
  const half = (FOCUS_COUNT - 1) / 2
  for (const item of items) {
    const distance = (item.offsetTop + item.offsetHeight / 2 - center) / pitch
    const beyond = Math.max(0, Math.abs(distance) - half)
    const tilt = -Math.sign(distance) * Math.min(Math.abs(distance) * 10 + beyond * 35, 75)
    item.style.setProperty('--roll-tilt', `${tilt.toFixed(1)}deg`)
    item.style.setProperty('--roll-scale', (1 - Math.min(beyond, 1.5) * 0.2).toFixed(3))
    item.style.setProperty('--roll-opacity', Math.max(0.08, 1 - beyond * 0.8).toFixed(3))
  }
}

export function SiteThumbnails({ sites, activeId, onSelect, onHover }: SiteThumbnailsProps) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        applyRoll(viewport)
      })
    }
    applyRoll(viewport)
    viewport.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [sites])

  // Le site sélectionné (depuis la carte, la recherche ou une miniature) est amené au centre du rouleau.
  useEffect(() => {
    const viewport = viewportRef.current
    const item = viewport?.querySelector<HTMLElement>('.thumb[aria-current="true"]')?.closest('li')
    if (!viewport || !item) return
    const vertical = matches(VERTICAL_LAYOUT)
    const target = vertical
      ? item.offsetTop + item.offsetHeight / 2 - viewport.clientHeight / 2
      : item.offsetLeft + item.offsetWidth / 2 - viewport.clientWidth / 2
    const behavior = matches('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth'
    if (typeof viewport.scrollTo !== 'function') return
    viewport.scrollTo(vertical ? { top: target, behavior } : { left: target, behavior })
  }, [activeId, sites])

  return (
    <div className="thumbs-viewport" ref={viewportRef}>
      <ul className="thumbs">
        {sites.map((site) => {
          const cover = site.photos[0]
          return (
            <li key={site.id}>
              <button
                type="button"
                className="thumb"
                aria-current={site.id === activeId ? 'true' : undefined}
                onClick={() => onSelect(site.id)}
                onMouseEnter={() => onHover(site.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(site.id)}
                onBlur={() => onHover(null)}
              >
                {cover ? (
                  <img src={photoUrl(cover.thumb ?? cover.path)} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="thumb__placeholder" aria-hidden="true">
                    <span>{t('story.noPhoto')}</span>
                  </span>
                )}
                <span className="thumb__name">{site.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
