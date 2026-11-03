import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Brand, LOGO_URL } from '../components/Brand'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ASSOCIATION_URL, SiteFooter } from '../components/SiteFooter'
import { usePageTitle } from '../components/usePageTitle'

const EMAIL = 'codesannzo@gmail.com'
const PHONE = '+237 699 83 72 27'

// À propos, contribuer, contact et mentions légales (sections atteintes par les liens du pied de page).
export function InfoPage() {
  const { t } = useTranslation()
  const { hash } = useLocation()
  usePageTitle(t('info.title'))

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) target.scrollIntoView?.()
    else document.documentElement.scrollTop = 0
  }, [hash])

  return (
    <div className="info-page">
      <header className="explorer__header info-page__header">
        <Brand />
        <LanguageSwitcher />
      </header>

      <main className="info-page__content">
        <img className="info-page__logo" src={LOGO_URL} alt={t('app.logoAlt')} width={160} height={120} />
        <h1>{t('info.title')}</h1>

        <section id="a-propos" aria-labelledby="info-about">
          <h2 id="info-about">{t('footer.about')}</h2>
          <p>{t('info.aboutText')}</p>
          <p>{t('story.welcomeText')}</p>
        </section>

        <section id="contribuer" aria-labelledby="info-contribute">
          <h2 id="info-contribute">{t('footer.contribute')}</h2>
          <p>{t('info.contributeText')}</p>
          <p>{t('info.contributeRules')}</p>
        </section>

        <section id="contact" aria-labelledby="info-contact">
          <h2 id="info-contact">{t('footer.contact')}</h2>
          <dl className="info-page__list">
            <dt>{t('info.email')}</dt>
            <dd>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </dd>
            <dt>{t('info.phone')}</dt>
            <dd>
              <a href={`tel:${PHONE.replace(/\s/g, '')}`}>{PHONE}</a>
            </dd>
            <dt>{t('info.office')}</dt>
            <dd>{t('info.officeValue')}</dd>
            <dt>{t('info.website')}</dt>
            <dd>
              <a href={ASSOCIATION_URL} target="_blank" rel="noopener noreferrer">
                mbosanzo.com
              </a>
            </dd>
          </dl>
        </section>

        <section id="mentions-legales" aria-labelledby="info-legal">
          <h2 id="info-legal">{t('footer.legal')}</h2>
          <dl className="info-page__list">
            <dt>{t('info.publisher')}</dt>
            <dd>
              {t('info.publisherText')} <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </dd>
            <dt>{t('info.hosting')}</dt>
            <dd>{t('info.hostingText')}</dd>
            <dt>{t('info.maps')}</dt>
            <dd>{t('info.mapsText')}</dd>
            <dt>{t('info.personalData')}</dt>
            <dd>{t('info.personalDataText')}</dd>
            <dt>{t('info.photos')}</dt>
            <dd>{t('info.photosText')}</dd>
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
