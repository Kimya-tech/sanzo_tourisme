import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { photoUrl } from '../lib/supabase'
import type { StoryPhoto } from './useStorySites'

interface PhotoViewerProps {
  photos: StoryPhoto[]
  /** Photo affichée ; null : visionneuse fermée. */
  index: number | null
  siteName: string
  credit: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

const SWIPE_DISTANCE = 50

// Visionneuse plein écran (<dialog> modal : focus piégé, reste de la page inerte).
// Flèches gauche / droite, balayage au doigt, Échap ou bouton pour fermer.
export function PhotoViewer({ photos, index, siteName, credit, onIndexChange, onClose }: PhotoViewerProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const open = index !== null && photos[index] !== undefined

  // Ouverture en modal ; à la fermeture, le focus revient sur l'élément qui l'avait ouverte.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
    dialog.querySelector<HTMLElement>('.photo-viewer__close')?.focus()
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
      opener?.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  const photo = photos[index]!
  const total = photos.length
  const go = (step: number) => onIndexChange((index + step + total) % total)

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowRight' && total > 1) {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowLeft' && total > 1) {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start || total < 2) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
  }

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label={t('story.photoViewer', { name: siteName })}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div
        className="photo-viewer__stage"
        onPointerDown={(event) => {
          swipeStartRef.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStartRef.current = null
        }}
      >
        <img
          key={photo.id}
          src={photoUrl(photo.path)}
          alt={photo.caption ?? t('story.photoAlt', { name: siteName, index: index + 1 })}
          draggable={false}
        />
      </div>

      <div className="photo-viewer__bar">
        <p className="photo-viewer__caption">
          <span className="photo-viewer__counter" aria-live="polite">
            {t('story.photoCounter', { index: index + 1, total })}
          </span>
          {photo.caption && <span>{photo.caption}</span>}
          <span className="photo-viewer__credit">{credit}</span>
        </p>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="photo-viewer__nav photo-viewer__nav--prev"
            onClick={() => go(-1)}
            aria-label={t('story.previousPhoto')}
          >
            ‹
          </button>
          <button
            type="button"
            className="photo-viewer__nav photo-viewer__nav--next"
            onClick={() => go(1)}
            aria-label={t('story.nextPhoto')}
          >
            ›
          </button>
        </>
      )}
      <button type="button" className="photo-viewer__close" onClick={onClose} aria-label={t('story.close')}>
        ×
      </button>
    </dialog>
  )
}
