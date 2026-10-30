import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Language } from '../i18n/languages'
import { googleMapsDirectionsUrl } from '../lib/directions'
import { formatIsoDate } from '../lib/dates'
import { photoUrl } from '../lib/supabase'
import { interleaveContent, splitParagraphs } from './content'
import type { StorySite } from './useStorySites'

interface SiteDetailsProps {
  site: StorySite
  language: Language
  previous: StorySite | null
  next: StorySite | null
  onSelect: (id: string) => void
  onClose: () => void
}

// Panneau de détails : photo principale, texte, photo, texte…
export function SiteDetails({ site, language, previous, next, onSelect, onClose }: SiteDetailsProps) {
  const { t } = useTranslation()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const blocks = interleaveContent(site.photos, splitParagraphs(site.description))
  const credit = t('story.photoBy', { name: site.collectorName })

  // Nouveau site : retour en haut du panneau et focus sur le titre (lecteurs d'écran).
  useEffect(() => {
    const title = titleRef.current
    const panel = title?.closest('.site-panel')
    if (panel) panel.scrollTop = 0
    title?.focus({ preventScroll: true })
  }, [site.id])

  return (
    <article className="site-details" aria-labelledby="site-details-title">
      <header className="site-details__header">
        <h2 id="site-details-title" ref={titleRef} tabIndex={-1}>
          {site.name}
        </h2>
        <a
          className="button button--primary directions-button"
          href={googleMapsDirectionsUrl(site.latitude, site.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          title={t('story.goToSite')}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4ZM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5Z"
            />
          </svg>
          <span className="visually-hidden">
            {t('story.goToSite')} {t('story.goToSiteHint')}
          </span>
        </a>
        <button type="button" className="site-details__close" onClick={onClose} aria-label={t('story.close')}>
          ×
        </button>
      </header>
      {site.language !== language && (
        <p className="site-details__note">{t('story.writtenIn', { language: t(`languageNames.${site.language}`) })}</p>
      )}

      <div className="site-details__content" lang={site.language}>
        {blocks.map((block) =>
          block.type === 'photo' ? (
            <figure key={`photo-${block.photo.id}`} className="site-photo">
              <img
                src={photoUrl(block.photo.path)}
                alt={block.photo.caption ?? t('story.photoAlt', { name: site.name, index: block.index + 1 })}
                width={block.photo.width ?? undefined}
                height={block.photo.height ?? undefined}
                loading={block.index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <figcaption>
                {block.photo.caption && <span>{block.photo.caption} · </span>}
                <span className="site-photo__credit">{credit}</span>
              </figcaption>
            </figure>
          ) : (
            <p key={`text-${block.index}`} className="site-details__text">
              {block.text}
            </p>
          ),
        )}
      </div>

      <p className="site-details__meta site-details__credit">
        {t('story.collectedBy', { name: site.collectorName, date: formatIsoDate(site.collectedOn, language) })}
      </p>

      <nav className="site-details__nav">
        {previous ? (
          <button type="button" className="button button--small" onClick={() => onSelect(previous.id)}>
            <span aria-hidden="true">←</span> {t('story.previous')}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" className="button button--small" onClick={() => onSelect(next.id)}>
            {t('story.next')} <span aria-hidden="true">→</span>
          </button>
        )}
      </nav>
    </article>
  )
}
