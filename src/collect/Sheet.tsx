import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface SheetProps {
  label: string
  /** Absent : le panneau ne peut pas être fermé (ex. accueil du collecteur). */
  onClose?: () => void
  children: ReactNode
}

// Panneau ouvert par-dessus la carte : plein écran sur téléphone, colonne à droite sur ordinateur.
export function Sheet({ label, onClose, children }: SheetProps) {
  const { t } = useTranslation()
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => {
    sheetRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!onClose) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop">
      <section ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {onClose && (
          <button type="button" className="sheet__close" onClick={onClose} aria-label={t('collect.close')}>
            ×
          </button>
        )}
        {children}
      </section>
    </div>
  )
}
