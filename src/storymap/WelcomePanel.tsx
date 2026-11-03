import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LOGO_URL } from '../components/Brand'
import { ASSOCIATION_URL, SiteFooter } from '../components/SiteFooter'
import { useLanguage } from '../i18n/useLanguage'
import { categoryColor } from '../lib/categories'
import { photoUrl } from '../lib/supabase'
import type { StorySite } from './useStorySites'

const COVER_URL = '/cover-sanzo.jpg'
const FEATURED_COUNT = 3

/** Sites mis en avant : les premiers du parcours (ordre choisi par l'équipe) qui ont une photo. */
function featuredSites(sites: StorySite[]): StorySite[] {
  const withPhoto = sites.filter((site) => site.photos.length > 0)
  return (withPhoto.length > 0 ? withPhoto : sites).slice(0, FEATURED_COUNT)
}

interface WelcomePanelProps {
  sites: StorySite[]
  onClose: () => void
}

// Panneau de droite quand aucun site n'est ouvert : présentation de Sanzo, sites à découvrir, liens utiles.
export function WelcomePanel({ sites, onClose }: WelcomePanelProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const featured = featuredSites(sites)

  return (
    <aside className="site-panel welcome" aria-labelledby="welcome-title">
      <div className="welcome__cover">
        <img src={COVER_URL} alt={t('story.coverAlt')} width={1200} height={900} decoding="async" />
        <button type="button" className="site-details__close welcome__close" onClick={onClose} aria-label={t('story.closeWelcome')}>
          ×
        </button>
      </div>

      <div className="welcome__body">
        <div className="welcome__identity">
          <img className="welcome__logo" src={LOGO_URL} alt={t('app.logoAlt')} width={80} height={60} />
          <p className="welcome__kicker">{t('app.tagline')}</p>
        </div>
        <h2 id="welcome-title">{t('story.welcomeTitle')}</h2>
        <p>{t('story.welcomeText')}</p>
        <p className="welcome__invite">{t('story.welcomeInvite')}</p>

        {featured.length > 0 && (
          <section aria-labelledby="featured-title">
            <h3 id="featured-title">{t('story.featuredHeading')}</h3>
            <ul className="featured">
              {featured.map((site) => {
                const cover = site.photos[0]
                return (
                  <li key={site.id}>
                    <Link to={`/${language}?site=${site.id}`} className="featured__item">
                      {cover ? (
                        <img src={photoUrl(cover.thumb ?? cover.path)} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="featured__placeholder" aria-hidden="true" />
                      )}
                      <span className="featured__text">
                        <span className="featured__name">{site.name}</span>
                        {site.category && (
                          <span className="featured__category">
                            <span
                              className="category-dot"
                              style={{ background: categoryColor(site.category) }}
                              aria-hidden="true"
                            />
                            {t(`categories.${site.category}`)}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <p>
          <a className="welcome__association" href={ASSOCIATION_URL} target="_blank" rel="noopener noreferrer">
            {t('story.associationLink')} <span aria-hidden="true">↗</span>
          </a>
        </p>
      </div>
      <SiteFooter className="site-footer--panel" />
    </aside>
  )
}
