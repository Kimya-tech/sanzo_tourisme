import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { usePageTitle } from '../components/usePageTitle'
import { useLanguage } from '../i18n/useLanguage'
import { SearchBox } from './SearchBox'
import { searchSites } from './search'
import { SiteDetails } from './SiteDetails'
import { SiteMap } from './SiteMap'
import { SiteThumbnails } from './SiteThumbnails'
import { useStorySites } from './useStorySites'

// Page unique : miniatures des sites à gauche, carte au centre, détails du site sélectionné à droite.
// Sur téléphone : carte plein écran avec bande de miniatures en bas ; les détails s'ouvrent sous la carte.
export function StoryMapPage() {
  const { t } = useTranslation()
  const language = useLanguage()
  const { status, sites, reload } = useStorySites()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const results = useMemo(() => searchSites(sites, query), [sites, query])
  const requestedId = searchParams.get('site')
  const selected = sites.find((site) => site.id === requestedId) ?? null
  usePageTitle(selected?.name ?? t('story.title'))

  // Le site sélectionné reste sur la carte même s'il ne correspond pas à la recherche.
  const mapSites = useMemo(
    () => (selected && !results.includes(selected) ? [...results, selected] : results),
    [results, selected],
  )

  // Navigation précédent / suivant dans la liste affichée (ou dans tous les sites).
  const sequence = selected && results.includes(selected) ? results : sites
  const position = selected ? sequence.indexOf(selected) : -1
  const previous = position > 0 ? (sequence[position - 1] ?? null) : null
  const next = position >= 0 && position < sequence.length - 1 ? (sequence[position + 1] ?? null) : null

  // L'adresse reflète le site ouvert (?site=<id>) : lien partageable, et le bouton Retour ferme le panneau.
  const select = useCallback(
    (id: string | null) => {
      setSearchParams(
        (current) => {
          const nextParams = new URLSearchParams(current)
          if (id) nextParams.set('site', id)
          else nextParams.delete('site')
          return nextParams
        },
        { replace: id === null || requestedId !== null },
      )
    },
    [requestedId, setSearchParams],
  )

  useEffect(() => {
    if (!selected) return
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.key === 'Escape' && target?.getAttribute('role') !== 'combobox') select(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [select, selected])

  return (
    <div className="explorer">
      <header className="explorer__header">
        <Link className="brand" to={`/${language}`} onClick={() => setQuery('')}>
          {t('app.name')}
        </Link>
        <SearchBox query={query} results={results} onQueryChange={setQuery} onSelect={select} />
        <LanguageSwitcher />
      </header>
      <h1 className="visually-hidden">{t('story.title')}</h1>

      <div className={`explorer__body${selected ? ' has-panel' : ''}`}>
        <nav className="site-strip" aria-label={t('story.sitesHeading')}>
          <h2 className="site-strip__heading">
            {t('story.sitesHeading')}{' '}
            {status === 'ready' && (
              <span className="site-strip__count" aria-live="polite">
                {t('story.sitesCount', { count: results.length })}
              </span>
            )}
          </h2>
          {status === 'loading' && (
            <p className="site-strip__status" role="status">
              {t('app.loading')}
            </p>
          )}
          {status === 'error' && (
            <div className="site-strip__status" role="alert">
              <p>{t('story.loadError')}</p>
              <button type="button" className="button button--small" onClick={reload}>
                {t('story.retry')}
              </button>
            </div>
          )}
          {status === 'ready' && sites.length === 0 && <p className="site-strip__status">{t('story.empty')}</p>}
          {status === 'ready' && sites.length > 0 && results.length === 0 && (
            <p className="site-strip__status">{t('story.noResults', { query: query.trim() })}</p>
          )}
          <SiteThumbnails
            sites={results}
            activeId={selected?.id ?? null}
            onSelect={select}
            onHover={setHoveredId}
          />
        </nav>

        <div className="explorer__map">
          <SiteMap
            sites={mapSites}
            activeId={selected?.id ?? null}
            hoveredId={hoveredId}
            onSelect={select}
            label={t('story.mapLabel')}
          />
        </div>

        {selected && (
          <aside className="site-panel" aria-label={t('story.panelLabel')}>
            <SiteDetails
              site={selected}
              language={language}
              previous={previous}
              next={next}
              onSelect={select}
              onClose={() => select(null)}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
