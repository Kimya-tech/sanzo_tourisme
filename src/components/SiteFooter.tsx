import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../i18n/useLanguage'

export const ASSOCIATION_URL = 'https://mbosanzo.com/'

/** Liens d'information : à propos, contribuer, contact, mentions légales (sections de la page /infos). */
export function SiteFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const links = [
    ['a-propos', t('footer.about')],
    ['contribuer', t('footer.contribute')],
    ['contact', t('footer.contact')],
    ['mentions-legales', t('footer.legal')],
  ] as const
  return (
    <footer className={`site-footer ${className}`.trim()}>
      <nav aria-label={t('footer.label')}>
        <ul>
          {links.map(([anchor, label]) => (
            <li key={anchor}>
              <Link to={`/${language}/infos#${anchor}`}>{label}</Link>
            </li>
          ))}
          <li>
            <a href={ASSOCIATION_URL} target="_blank" rel="noopener noreferrer">
              mbosanzo.com
            </a>
          </li>
        </ul>
      </nav>
      <p>© {new Date().getFullYear()} {t('app.association')}</p>
    </footer>
  )
}
