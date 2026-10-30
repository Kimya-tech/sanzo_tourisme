import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, switchLanguageInPath } from '../i18n/languages'
import { useLanguage } from '../i18n/useLanguage'

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const current = useLanguage()
  const location = useLocation()

  return (
    <nav className="language-switcher" aria-label={t('app.language')}>
      {SUPPORTED_LANGUAGES.map((language) =>
        language === current ? (
          <span key={language} aria-current="true" lang={language}>
            {language.toUpperCase()}
          </span>
        ) : (
          <Link
            key={language}
            lang={language}
            hrefLang={language}
            title={t('app.switchTo')}
            to={`${switchLanguageInPath(location.pathname, language)}${location.search}${location.hash}`}
          >
            {language.toUpperCase()}
          </Link>
        ),
      )}
    </nav>
  )
}
