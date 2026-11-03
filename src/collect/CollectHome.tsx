import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Brand } from '../components/Brand'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { usePageTitle } from '../components/usePageTitle'
import { useLanguage } from '../i18n/useLanguage'
import { listMySites, listPublishedSites, type MySite, type SitePoint } from './api'
import { CollectMap } from './CollectMap'
import { useCollector } from './collector-context'
import { useGeolocation } from './geolocation-context'
import { MySitesPage } from './MySitesPage'
import { Onboarding } from './Onboarding'
import { Sheet } from './Sheet'
import { SiteFormPage } from './SiteFormPage'

type FlashMessage = 'collect.saved' | 'collect.deleted'
interface FlashState {
  message?: FlashMessage
  siteId?: string
}

// Écran principal de la collecte : carte plein écran, position de l'utilisateur et bouton « Ajouter un site ».
// Le formulaire et la liste s'ouvrent par-dessus la carte, qui reste chargée.
export function CollectHome() {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, retry } = useCollector()
  const geo = useGeolocation()
  const [mySites, setMySites] = useState<MySite[]>([])
  const [otherSites, setOtherSites] = useState<SitePoint[]>([])
  const [reloadToken, setReloadToken] = useState(0)
  const [recenterSignal, setRecenterSignal] = useState(0)
  usePageTitle(t('collect.title'))

  const base = `/${language}/collecte`
  const flash = (location.state as FlashState | null) ?? {}
  const userId = state.status === 'ready' ? state.userId : null

  useEffect(() => {
    let cancelled = false
    void listPublishedSites()
      .then((sites) => {
        if (!cancelled) setOtherSites(sites)
      })
      .catch(() => undefined)
    if (userId) {
      void listMySites(userId)
        .then((sites) => {
          if (!cancelled) setMySites(sites)
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [reloadToken, userId])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])
  const closeSheet = useCallback(() => void navigate(base), [base, navigate])
  const editSite = useCallback((id: string) => void navigate(`${base}/${id}`), [base, navigate])

  function locate() {
    if (geo.status === 'ready') setRecenterSignal((value) => value + 1)
    else geo.request()
  }

  return (
    <div className="collect-home">
      <CollectMap
        label={t('collect.mapLabel')}
        userPosition={geo.position}
        mySites={mySites}
        otherSites={otherSites}
        otherSiteLabel={t('collect.otherSite')}
        editLabel={t('collect.edit')}
        recenterSignal={recenterSignal}
        focusSiteId={flash.siteId ?? null}
        onEditSite={editSite}
      />

      <header className="collect-topbar">
        <Brand />
        <LanguageSwitcher />
      </header>

      <div className="collect-status" aria-live="polite">
        {flash.message && <p className="toast">{t(flash.message)}</p>}
        {geo.status === 'locating' && !geo.position && <p className="toast toast--info">{t('gps.waiting')}</p>}
        {(geo.status === 'denied' || geo.status === 'unavailable' || geo.status === 'unsupported') && (
          <div className="banner" role="alert">
            <p>
              {t(
                geo.status === 'denied'
                  ? 'gps.deniedBanner'
                  : geo.status === 'unavailable'
                    ? 'gps.unavailable'
                    : 'gps.unsupported',
              )}
            </p>
            {geo.status !== 'unsupported' && (
              <button type="button" className="button button--small" onClick={geo.request}>
                {t('gps.allow')}
              </button>
            )}
          </div>
        )}
      </div>

      {state.status === 'ready' && (
        <>
          <div className="collect-tools">
            <button type="button" className="map-button" onClick={locate}>
              {t('collect.locateMe')}
            </button>
            <Link className="map-button" to={`${base}/mes-sites`}>
              {t('collect.mySitesButton')} ({mySites.length})
            </Link>
          </div>
          <Link className="fab-add" to={`${base}/nouveau`}>
            <span aria-hidden="true">+</span> {t('collect.addSite')}
          </Link>
          <Routes>
            <Route index element={null} />
            <Route path="mes-sites" element={<MySitesPage sites={mySites} onClose={closeSheet} />} />
            <Route path="nouveau" element={<SiteFormPage onSaved={reload} onClose={closeSheet} />} />
            <Route path=":siteId" element={<SiteFormPage onSaved={reload} onClose={closeSheet} />} />
          </Routes>
        </>
      )}

      {state.status === 'onboarding' && (
        <Sheet label={t('collect.title')}>
          <Onboarding />
        </Sheet>
      )}
      {state.status === 'disabled' && (
        <Sheet label={t('collect.title')}>
          <p role="alert">{t('collect.disabled')}</p>
        </Sheet>
      )}
      {state.status === 'error' && (
        <Sheet label={t('collect.title')}>
          <p role="alert">{t('errors.network')}</p>
          <button type="button" className="button" onClick={retry}>
            {t('story.retry')}
          </button>
        </Sheet>
      )}
    </div>
  )
}
