import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
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

// Défilement automatique : une miniature toutes les 4 s ; reprise 6 s après une action de l'utilisateur.
const ROTATION_INTERVAL_MS = 4000
const RESUME_DELAY_MS = 6000

const matches = (query: string) => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined
      list?.addEventListener?.('change', onChange)
      return () => list?.removeEventListener?.('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => matches(query),
    () => false,
  )
}

function centerItem(viewport: HTMLElement, item: HTMLElement, vertical: boolean, behavior: ScrollBehavior) {
  if (typeof viewport.scrollTo !== 'function') return
  if (vertical) {
    viewport.scrollTo({ top: item.offsetTop + item.offsetHeight / 2 - viewport.clientHeight / 2, behavior })
  } else {
    viewport.scrollTo({ left: item.offsetLeft + item.offsetWidth / 2 - viewport.clientWidth / 2, behavior })
  }
}

// Effet de rouleau : chaque miniature est inclinée, réduite et estompée selon sa distance au centre.
// Les styles sont posés directement sur les éléments pour éviter un rendu React à chaque défilement.
function applyRoll(viewport: HTMLElement) {
  const items = Array.from(viewport.querySelectorAll<HTMLElement>('.thumbs > li'))
  if (!matches(VERTICAL_LAYOUT)) {
    for (const item of items) {
      item.removeAttribute('style')
      item.classList.remove('is-centered')
    }
    return
  }
  const [first, second] = items
  if (!first) return
  const pitch = second ? second.offsetTop - first.offsetTop : first.offsetHeight
  if (pitch <= 0) return
  const center = viewport.scrollTop + viewport.clientHeight / 2
  const half = (FOCUS_COUNT - 1) / 2
  let nearest: HTMLElement | null = null
  let nearestDistance = Infinity
  for (const item of items) {
    const distance = (item.offsetTop + item.offsetHeight / 2 - center) / pitch
    const beyond = Math.max(0, Math.abs(distance) - half)
    const tilt = -Math.sign(distance) * Math.min(Math.abs(distance) * 10 + beyond * 35, 75)
    item.style.setProperty('--roll-tilt', `${tilt.toFixed(1)}deg`)
    item.style.setProperty('--roll-scale', (1 - Math.min(beyond, 1.5) * 0.2).toFixed(3))
    item.style.setProperty('--roll-opacity', Math.max(0.08, 1 - beyond * 0.8).toFixed(3))
    if (Math.abs(distance) < nearestDistance) {
      nearestDistance = Math.abs(distance)
      nearest = item
    }
  }
  // Le nom de la miniature centrale reste affiché : on lit la liste d'un coup d'œil en la faisant défiler.
  for (const item of items) item.classList.toggle('is-centered', item === nearest)
}

export function SiteThumbnails({ sites, activeId, onSelect, onHover }: SiteThumbnailsProps) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)
  const vertical = useMediaQuery(VERTICAL_LAYOUT)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [paused, setPaused] = useState(false)
  // Uniquement sur ordinateur (rouleau vertical) et si le système n'a pas demandé de limiter les animations.
  const canRotate = vertical && !reducedMotion && sites.length > 1
  const rotating = canRotate && !paused && activeId === null

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
    centerItem(
      viewport,
      item,
      matches(VERTICAL_LAYOUT),
      matches('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth',
    )
  }, [activeId, sites])

  // Rotation : le rouleau présente chaque site à tour de rôle (nom affiché), sans rien sélectionner (ni panneau,
  // ni carte). Elle s'interrompt au survol, au focus clavier ou au défilement manuel, et s'arrête tant qu'un site
  // est ouvert. Le site « présenté » est suivi à part : les premières et dernières miniatures ne peuvent pas
  // venir exactement au centre du rouleau (3 miniatures restent nettes en début et en fin de liste).
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !rotating) return
    const items = () => Array.from(viewport.querySelectorAll<HTMLElement>('.thumbs > li'))
    const nearestIndex = () => {
      const center = viewport.scrollTop + viewport.clientHeight / 2
      let nearest = 0
      let best = Infinity
      items().forEach((item, index) => {
        const distance = Math.abs(item.offsetTop + item.offsetHeight / 2 - center)
        if (distance < best) {
          best = distance
          nearest = index
        }
      })
      return nearest
    }
    const present = (index: number) => {
      items().forEach((item, i) => item.classList.toggle('is-presented', i === index))
    }

    let hovering = false
    let focused = false
    let lastInteraction = 0
    let resync = false
    let presented = nearestIndex()
    viewport.classList.add('is-rotating')
    present(presented)

    const interact = () => {
      lastInteraction = Date.now()
      resync = true
    }
    const enter = () => {
      hovering = true
    }
    const leave = () => {
      hovering = false
      interact()
    }
    const focusIn = () => {
      focused = true
    }
    const focusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget)) return
      focused = false
      interact()
    }
    const userEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    for (const name of userEvents) viewport.addEventListener(name, interact, { passive: true })
    viewport.addEventListener('pointerenter', enter)
    viewport.addEventListener('pointerleave', leave)
    viewport.addEventListener('focusin', focusIn)
    viewport.addEventListener('focusout', focusOut)

    const timer = setInterval(() => {
      if (hovering || focused || document.visibilityState === 'hidden') return
      if (Date.now() - lastInteraction < RESUME_DELAY_MS) return
      const list = items()
      if (list.length < 2) return
      // Après un défilement manuel, la rotation reprend depuis la miniature centrale.
      if (resync) {
        presented = nearestIndex()
        resync = false
      }
      presented = (presented + 1) % list.length
      present(presented)
      centerItem(viewport, list[presented]!, true, 'smooth')
    }, ROTATION_INTERVAL_MS)

    return () => {
      clearInterval(timer)
      viewport.classList.remove('is-rotating')
      present(-1)
      for (const name of userEvents) viewport.removeEventListener(name, interact)
      viewport.removeEventListener('pointerenter', enter)
      viewport.removeEventListener('pointerleave', leave)
      viewport.removeEventListener('focusin', focusIn)
      viewport.removeEventListener('focusout', focusOut)
    }
  }, [rotating, sites])

  return (
    <>
      {canRotate && (
        <button
          type="button"
          className="thumbs-autoplay"
          onClick={() => setPaused((value) => !value)}
          aria-label={t(paused ? 'story.playRotation' : 'story.pauseRotation')}
          title={t(paused ? 'story.playRotation' : 'story.pauseRotation')}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d={paused ? 'M8 5v14l11-7z' : 'M7 5h4v14H7zM13 5h4v14h-4z'} />
          </svg>
        </button>
      )}
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
    </>
  )
}
