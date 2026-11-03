import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../i18n/useLanguage'

export const LOGO_URL = '/logo-codesa.jpg'

/** Logo du CODESA et nom de la plateforme : retour à l'accueil de la carte. */
export function Brand({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  return (
    <Link className="brand" to={`/${language}`} onClick={onClick} aria-label={t('app.home')}>
      <img className="brand__logo" src={LOGO_URL} alt="" width={53} height={40} />
      <span>{t('app.name')}</span>
    </Link>
  )
}
