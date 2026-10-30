import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FormError } from '../components/Form'
import { useLanguage } from '../i18n/useLanguage'
import { formatIsoDate } from '../lib/dates'
import type { ErrorKey } from '../lib/errors'
import type { MySite } from './api'
import { useCollector, useReadyCollector } from './collector-context'
import { Sheet } from './Sheet'

export function MySitesPage({ sites, onClose }: { sites: MySite[]; onClose: () => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { rename } = useCollector()
  const collector = useReadyCollector()
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState<ErrorKey | null>(null)

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await rename(String(new FormData(event.currentTarget).get('name') ?? ''))
    setRenameError(result)
    if (!result) setRenaming(false)
  }

  return (
    <Sheet label={t('collect.mySites')} onClose={onClose}>
      <h1>{t('collect.hello', { name: collector.name })}</h1>
      {renaming ? (
        <form className="inline-form" onSubmit={(event) => void handleRename(event)}>
          <label htmlFor="rename">{t('collect.yourName')}</label>
          <input id="rename" name="name" defaultValue={collector.name} minLength={2} maxLength={80} required />
          <button type="submit" className="button">
            {t('collect.saveName')}
          </button>
          <button type="button" className="link-button" onClick={() => setRenaming(false)}>
            {t('collect.cancel')}
          </button>
          <FormError>{renameError && t(renameError)}</FormError>
        </form>
      ) : (
        <button type="button" className="link-button" onClick={() => setRenaming(true)}>
          {t('collect.changeName')}
        </button>
      )}

      <h2>{t('collect.mySites')}</h2>
      {sites.length === 0 ? (
        <p>{t('collect.noSites')}</p>
      ) : (
        <ul className="my-sites">
          {sites.map((site) => (
            <li key={site.id}>
              <div>
                <strong>{site.name}</strong>
                <span>
                  {formatIsoDate(site.collectedOn, language)} ·{' '}
                  {t('collect.photoCount', { count: site.photoCount })}
                </span>
              </div>
              <div className="my-sites__actions">
                <Link className="button button--small" to={`/${language}/collecte/${site.id}`}>
                  {t('collect.edit')}
                </Link>
                {site.isPublished && (
                  <Link className="button button--small" to={`/${language}?site=${site.id}`}>
                    {t('collect.viewOnMap')}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link className="button button--primary button--large" to={`/${language}/collecte/nouveau`}>
          + {t('collect.addSite')}
        </Link>
      </p>
      <p className="field-hint">{t('collect.install')}</p>
    </Sheet>
  )
}
